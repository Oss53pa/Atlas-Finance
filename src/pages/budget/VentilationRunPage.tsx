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
const IFRS_MAPPING: Array<{ theme: string; syscohada: string; ifrs: string }> = [
  { theme: 'Immobilisations corporelles', syscohada: 'Classe 2', ifrs: 'IAS 16 — contrôle, avantages futurs, coût fiable, seuil' },
  { theme: 'Immobilisations en cours', syscohada: 'Compte 23', ifrs: 'IAS 16 — assets under construction' },
  { theme: "Coûts d'emprunt (construction)", syscohada: 'Incorporation au coût', ifrs: 'IAS 23 — capitalisation des intérêts' },
  { theme: "Dépréciation d'actifs", syscohada: 'Provisions', ifrs: 'IAS 36 — test d’impairment' },
];

const CLASSE_LABEL: Record<string, string> = { '2': 'Immobilisations (2)', '6': 'Charges (6)', '7': 'Produits (7)' };

const VentilationRunPage: React.FC = () => {
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
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const sectionLabel = (id: string) => { const s = sections.find(x => x.id === id); return s ? `${s.code} · ${s.libelle}` : '—'; };
  const keyLabel = (id: string | null) => { const k = keys.find(x => x.id === id); return k ? `clé ${k.code}` : '—'; };

  const addRule = async () => {
    if (nr.type === 'SECONDAIRE') {
      if (!nr.source_section_id) { toast.error('Choisissez la section auxiliaire source'); return; }
      if (!nr.key_id) { toast.error('Choisissez une clé de répartition'); return; }
    } else {
      if (!nr.compte_pattern && !nr.journal_pattern && !nr.libelle_pattern && !nr.tiers_pattern) { toast.error('Au moins un critère (compte, journal, libellé ou tiers)'); return; }
      if (nr.type === 'DIRECT' && !nr.section_id) { toast.error('Choisissez une section cible'); return; }
      if (nr.type === 'PRIMAIRE' && !nr.key_id) { toast.error('Choisissez une clé de répartition'); return; }
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
      toast.success('Règle ajoutée'); load();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const addKey = async () => {
    if (!nk.code.trim() || !nk.libelle.trim()) { toast.error('Code et libellé requis'); return; }
    try { await createKey(adapter, nk); setNk({ code: '', libelle: '', unite: '' }); toast.success('Clé créée'); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const openKeyWeights = async (keyId: string) => {
    if (editKey === keyId) { setEditKey(''); return; }
    setEditKey(keyId);
    try {
      const vals = await listKeyValues(adapter, keyId);
      const m: Record<string, string> = {};
      for (const v of vals) m[v.section_id] = String(v.valeur);
      setWeights(m);
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const saveWeights = async () => {
    try {
      for (const s of sections) {
        const v = parseFloat(weights[s.id] || '');
        if (!isNaN(v)) await setKeyValue(adapter, editKey, s.id, v);
      }
      toast.success('Poids enregistrés'); setEditKey('');
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const launch = async () => {
    if (sections.length === 0) { toast.error('Créez d’abord des sections (Comptabilité Analytique).'); return; }
    setRunning(true); setReport(null);
    try {
      const rep = await runVentilation(adapter, parseInt(annee, 10));
      setReport(rep);
      toast.success(`Run terminé · couverture ${rep.couverture_pct}%${rep.reconcilie ? ' · réconcilié' : ' · NON réconcilié'}`);
      load();
    } catch (e: any) { toast.error('Run échoué : ' + (e?.message || 'erreur')); }
    finally { setRunning(false); }
  };

  const runProphet = async () => {
    setProphetLoading(true); setProphet(null);
    try {
      const cls = (report?.classes ?? recon).map(c => `classe ${c.classe}: couverture ${c.couverture_pct}%, résidu ${Math.round(c.residu)}`).join(' ; ');
      const top = (report?.topNonFleches ?? []).slice(0, 6).map(t => `${t.account_code} (${Math.round(t.montant)})`).join(', ');
      const res = await askProph3t({
        message: `En tant que contrôleur de gestion SYSCOHADA, commente brièvement (5 lignes max, français) la QUALITÉ de ventilation analytique sans inventer de chiffres. ${cls}. Comptes non fléchés majeurs : ${top || 'aucun'}. Propose 2-3 règles de fléchage concrètes (par compte/journal) pour améliorer la couverture.`,
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

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement du moteur de ventilation…</div>;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Split className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Moteur de Ventilation</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Reconstruction analytique du grand livre · Exercice {annee} · déterministe & réconcilié</p>
        </div>
        {isProph3tCoreConfigured() && (
          <button onClick={runProphet} disabled={prophetLoading} className="px-3 py-2 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/5 flex items-center gap-2 disabled:opacity-50">
            <Bot className="w-4 h-4" />{prophetLoading ? 'Analyse…' : 'Commentaire PROPH3T'}
          </button>
        )}
        <button onClick={launch} disabled={running} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          <Play className="w-4 h-4" />{running ? 'Run en cours…' : 'Lancer le run'}
        </button>
        <PageHeaderActions onToggleFilters={() => setFiltersOpen(o => !o)} filtersOpen={filtersOpen} activeFilters={query.trim() ? 1 : 0} printTitle={`Ventilation analytique ${annee}`} />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-4 print-hide">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une règle…" className="pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg w-72" />
          </div>
        </div>
      )}

      {/* KPIs réconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Couverture de ventilation" value={`${couverture}%`} icon={ShieldCheck} color={couverture >= 95 ? 'success' : couverture > 0 ? 'warning' : 'neutral'} />
        <KPICard title="Montant ventilé" value={formatCurrency(totVent)} icon={Split} color="primary" valueFontSize="1.05rem" />
        <KPICard title="Résidu « À VENTILER »" value={formatCurrency(residu)} icon={AlertTriangle} color={residu > 0 ? 'warning' : 'success'} valueFontSize="1.05rem" />
        <KPICard title="Réconciliation" value={reconcilie ? 'Équilibrée' : 'En écart'} icon={reconcilie ? CheckCircle : AlertTriangle} color={reconcilie ? 'success' : 'error'} />
      </div>

      {sections.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between">
          <span>Aucune section analytique. Créez vos centres / sections avant de ventiler.</span>
          <button onClick={() => navigate('/analytique')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs">Aller à la Comptabilité Analytique</button>
        </div>
      )}

      {prophet && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-primary)]/30 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-sm mb-2"><Bot className="w-4 h-4" />Lecture PROPH3T — qualité de ventilation</div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{prophet}</p>
          <p className="text-[10px] text-gray-400 mt-2">Analyse indicative — PROPH3T ne produit jamais les chiffres comptables.</p>
        </div>
      )}

      {/* Réconciliation par classe */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">Réconciliation analytique ↔ générale</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">{report ? 'Résultat du dernier run' : 'État courant (live)'} · invariant : Σ ventilé = Σ GL pour la part fléchée</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Classe</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant GL</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Ventilé</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Résidu</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Couverture</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Aucun mouvement analytique sur l’exercice.</td></tr>}
            {classes.map(c => (
              <tr key={c.classe} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{CLASSE_LABEL[c.classe] || `Classe ${c.classe}`}</td>
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
          <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">Top comptes non fléchés (« À VENTILER »)</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Compte</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant non ventilé</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">GL</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {report.topNonFleches.map(t => (
                <tr key={t.account_code} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{t.account_code}</span> <span className="text-gray-800">{t.account_name}</span></td>
                  <td className="px-4 py-2.5 text-right text-amber-700">{formatCurrency(t.montant)}</td>
                  <td className="px-4 py-2.5 text-center"><button onClick={() => navigate(`/accounting/general-ledger?compte=${t.account_code}`)} className="text-gray-300 hover:text-[var(--color-primary)]" title="Voir les écritures"><ExternalLink className="w-3.5 h-3.5 inline" /></button></td>
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
              <h2 className="font-semibold text-[var(--color-primary)]">Répartition secondaire</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">Déversement des sections auxiliaires sur les principales (méthode step-down) · total {formatCurrency(transfers.reduce((s, t) => s + t.montant, 0))}</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Section auxiliaire</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Section principale</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant déversé</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{sectionLabel(t.from_section_id)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-400">→</td>
                  <td className="px-4 py-2.5 text-gray-800">{sectionLabel(t.to_section_id)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(t.montant)}</td>
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
            <h2 className="font-semibold text-[var(--color-primary)]">Clés de répartition</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">Poids par section (surface m², effectif, CA, inducteur ABC). Utilisées par les règles « primaire ».</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-[var(--color-border)] bg-gray-50/50">
          <input value={nk.code} onChange={e => setNk(s => ({ ...s, code: e.target.value }))} placeholder="Code (ex. SURFACE_M2)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
          <input value={nk.libelle} onChange={e => setNk(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <input value={nk.unite} onChange={e => setNk(s => ({ ...s, unite: e.target.value }))} placeholder="Unité (m², pers.…)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <button onClick={addKey} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />Clé</button>
        </div>
        <div className="divide-y divide-gray-100">
          {keys.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">Aucune clé. Créez-en une pour la répartition primaire.</div>}
          {keys.map(k => (
            <div key={k.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm"><span className="font-mono text-gray-500">{k.code}</span> <span className="text-gray-800">{k.libelle}</span>{k.unite && <span className="text-xs text-gray-400 ml-1">({k.unite})</span>}</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openKeyWeights(k.id)} className="text-xs text-[var(--color-primary)] hover:underline">{editKey === k.id ? 'Fermer' : 'Définir les poids'}</button>
                  <button onClick={() => deleteKey(adapter, k.id).then(load)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {editKey === k.id && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                  {sections.length === 0 && <p className="text-xs text-gray-400">Créez des sections d’abord.</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sections.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 flex-1 truncate"><span className="font-mono text-gray-400">{s.code}</span> {s.libelle}</span>
                        <input type="number" value={weights[s.id] ?? ''} onChange={e => setWeights(w => ({ ...w, [s.id]: e.target.value }))} placeholder="0" className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </div>
                    ))}
                  </div>
                  {sections.length > 0 && <button onClick={saveWeights} className="mt-3 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1"><Save className="w-3.5 h-3.5" />Enregistrer les poids</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Règles de ventilation (direct / primaire) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">Règles de ventilation</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">Direct : compte/journal/libellé/tiers → section. Primaire : résidu réparti par clé. Appliquées dans l’ordre.</p>
        </div>
        {/* Ajout */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-7 gap-2 border-b border-[var(--color-border)] bg-gray-50/50">
          <select value={nr.type} onChange={e => setNr(s => ({ ...s, type: e.target.value as RuleType }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="DIRECT">Direct</option>
            <option value="PRIMAIRE">Primaire (clé)</option>
            <option value="SECONDAIRE">Secondaire (auxiliaire→princ.)</option>
          </select>
          {nr.type === 'SECONDAIRE' ? (<>
            <select value={nr.source_section_id} onChange={e => setNr(s => ({ ...s, source_section_id: e.target.value }))} className="md:col-span-4 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">Section auxiliaire source…</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
            </select>
            <select value={nr.key_id} onChange={e => setNr(s => ({ ...s, key_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">→ Clé (vers principales)…</option>
              {keys.map(k => <option key={k.id} value={k.id}>{k.code} · {k.libelle}</option>)}
            </select>
          </>) : (<>
            <input value={nr.compte_pattern} onChange={e => setNr(s => ({ ...s, compte_pattern: e.target.value }))} placeholder="Compte (préfixe)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            <input value={nr.journal_pattern} onChange={e => setNr(s => ({ ...s, journal_pattern: e.target.value }))} placeholder="Journal" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={nr.libelle_pattern} onChange={e => setNr(s => ({ ...s, libelle_pattern: e.target.value }))} placeholder="Libellé contient…" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={nr.tiers_pattern} onChange={e => setNr(s => ({ ...s, tiers_pattern: e.target.value }))} placeholder="Code tiers" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            {nr.type === 'DIRECT' ? (
              <select value={nr.section_id} onChange={e => setNr(s => ({ ...s, section_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">→ Section cible…</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
              </select>
            ) : (
              <select value={nr.key_id} onChange={e => setNr(s => ({ ...s, key_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">→ Clé de répartition…</option>
                {keys.map(k => <option key={k.id} value={k.id}>{k.code} · {k.libelle}</option>)}
              </select>
            )}
          </>)}
          <button onClick={addRule} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />Ajouter</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Ordre</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Critères</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">→ Section</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Actif</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRules.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{rules.length === 0 ? 'Aucune règle. Ajoutez-en une ci-dessus.' : 'Aucune règle ne correspond.'}</td></tr>}
            {filteredRules.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${!r.actif ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-gray-500">
                  <span className="inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{r.type === 'PRIMAIRE' ? 'PRIM.' : r.type === 'SECONDAIRE' ? 'SEC.' : 'DIR.'}</span>
                  {r.ordre}
                </td>
                <td className="px-4 py-2.5 text-gray-700 text-xs">
                  {[r.compte_pattern && `compte ${r.compte_pattern}*`, r.journal_pattern && `journal ${r.journal_pattern}`, r.libelle_pattern && `libellé « ${r.libelle_pattern} »`, r.tiers_pattern && `tiers ${r.tiers_pattern}`].filter(Boolean).join(' · ')}
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
        <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">Historique des runs (piste d’audit)</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Date</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Exercice</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Couverture</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Lignes ventilées</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Statut</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Hash</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun run encore. Lancez le moteur.</td></tr>}
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
            <h2 className="font-semibold text-[var(--color-primary)]">Correspondance SYSCOHADA ↔ IFRS (dual-GAAP)</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">Référence posée — restitution IFRS activable en V2.</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Thème</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">SYSCOHADA</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">IFRS</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {IFRS_MAPPING.map(m => (
              <tr key={m.theme} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{m.theme}</td>
                <td className="px-4 py-2.5 text-gray-600">{m.syscohada}</td>
                <td className="px-4 py-2.5 text-gray-600">{m.ifrs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VentilationRunPage;
