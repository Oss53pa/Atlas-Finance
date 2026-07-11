/**
 * ProjetPirPage — /capex/pir/:projetId (refonte OPEX/CAPEX, Lot 6, §22.1).
 * Revue post-implémentation : investissement final vs approprié, délai, bénéfices
 * constatés, VAN ex-post, leçons apprises. Persistée dans capex_pir.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { getProjet, getProjetExecution } from '../../features/budget/services/carService';
import { getPir, savePir } from '../../features/budget/services/pirService';
import { ClipboardCheck, Loader2, ArrowLeft, Save } from 'lucide-react';

const INP = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235A6E]/30';

const ProjetPirPage: React.FC = () => {
  const { projetId = '' } = useParams();
  const { adapter } = useData();
  const navigate = useNavigate();
  const [libelle, setLibelle] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [approprie, setApproprie] = useState(0);
  const [coutFinal, setCoutFinal] = useState('');
  const [delai, setDelai] = useState('');
  const [benefices, setBenefices] = useState('');
  const [vanExPost, setVanExPost] = useState('');
  const [lecons, setLecons] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const p = await getProjet(adapter, projetId);
        if (!p) { if (!cancelled) { setError('Projet introuvable.'); setLoading(false); } return; }
        const a = await getDefaultAnnee(adapter);
        const [exec, pir] = await Promise.all([getProjetExecution(adapter, p, a), getPir(adapter, projetId)]);
        if (cancelled) return;
        setLibelle(`${p.code} · ${p.libelle}`); setRequestId(p.request_id); setApproprie(exec.approprie);
        setCoutFinal(String(pir?.cout_final ?? exec.realise ?? ''));
        setDelai(String(pir?.delai_reel_jours ?? ''));
        setBenefices(String(pir?.benefices_constates ?? ''));
        setVanExPost(String(pir?.van_ex_post ?? ''));
        setLecons(pir?.lecons ?? '');
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, projetId]);

  const ecart = (Number(coutFinal) || 0) - approprie;

  const save = useCallback(async () => {
    setSaving(true); setError(null); setNotice(null);
    try {
      await savePir(adapter, projetId, requestId, {
        cout_final: coutFinal ? Number(coutFinal) : null, ecart_approprie: coutFinal ? ecart : null,
        delai_reel_jours: delai ? Number(delai) : null, benefices_constates: benefices ? Number(benefices) : null,
        van_ex_post: vanExPost ? Number(vanExPost) : null, lecons: lecons || null,
      });
      setNotice('PIR enregistrée.');
    } catch (e: any) { setError(e?.message || 'Échec'); } finally { setSaving(false); }
  }, [adapter, projetId, requestId, coutFinal, ecart, delai, benefices, vanExPost, lecons]);

  if (loading) return <div className="flex items-center gap-2 text-neutral-500 py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(`/capex/projet/${projetId}`)} className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-[#235A6E]" /> Revue post-implémentation</h1>
          <p className="text-xs text-neutral-500">{libelle}</p>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block"><span className="block text-xs text-neutral-500 mb-1">Montant approprié</span><div className="px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 font-mono text-sm">{formatCurrency(approprie)}</div></label>
          <label className="block"><span className="block text-xs text-neutral-500 mb-1">Investissement final</span><input type="number" value={coutFinal} onChange={(e) => setCoutFinal(e.target.value)} className={`${INP} font-mono`} /></label>
          <label className="block"><span className="block text-xs text-neutral-500 mb-1">Écart vs approprié</span><div className={`px-3 py-2 rounded-lg font-mono text-sm ${ecart > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(ecart)}</div></label>
          <label className="block"><span className="block text-xs text-neutral-500 mb-1">Délai réel (jours)</span><input type="number" value={delai} onChange={(e) => setDelai(e.target.value)} className={`${INP} font-mono`} /></label>
          <label className="block"><span className="block text-xs text-neutral-500 mb-1">Bénéfices constatés (an 1)</span><input type="number" value={benefices} onChange={(e) => setBenefices(e.target.value)} className={`${INP} font-mono`} /></label>
          <label className="block"><span className="block text-xs text-neutral-500 mb-1">VAN ex-post</span><input type="number" value={vanExPost} onChange={(e) => setVanExPost(e.target.value)} className={`${INP} font-mono`} /></label>
        </div>
        <label className="block"><span className="block text-xs text-neutral-500 mb-1">Leçons apprises</span><textarea value={lecons} onChange={(e) => setLecons(e.target.value)} rows={5} className={INP} placeholder="Biais d'estimation, causes de dérive, recommandations pour les prochains BC…" /></label>
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#235A6E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer la PIR</button>
        </div>
      </div>
    </div>
  );
};

export default ProjetPirPage;
