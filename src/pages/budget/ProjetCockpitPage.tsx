/**
 * ProjetCockpitPage — /capex/projet/:id (refonte OPEX/CAPEX, Lot 5/6, §20).
 *
 * Cockpit d'exécution d'un projet CAPEX : montant approprié vs engagé vs réalisé,
 * courbe en S (cumuls mensuels plan / engagé / réalisé), alertes CPX. Réalisé = GL
 * classe 2 ventilé sur la section projet ; engagé = registre ; plan = phasage BC.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { getProjet, getProjetExecution, type CapexProjet, type ProjetExecution } from '../../features/budget/services/carService';
import { commissionProject, type CommissioningResult } from '../../features/budget/services/commissioningService';
import { Rocket, Loader2, ArrowLeft, AlertTriangle, PackageCheck, ClipboardCheck } from 'lucide-react';

const MOIS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const SCurve: React.FC<{ exec: ProjetExecution }> = ({ exec }) => {
  const W = 640, H = 240, pad = 36;
  const max = Math.max(exec.approprie, ...exec.points.map((p) => Math.max(p.planCumul, p.engageCumul, p.realiseCumul)), 1);
  const x = (i: number) => pad + (i / 11) * (W - 2 * pad);
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad);
  const path = (key: 'planCumul' | 'engageCumul' | 'realiseCumul') =>
    exec.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ');
  const yApp = y(exec.approprie);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe en S">
      {/* axes */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
      {/* montant approprié */}
      <line x1={pad} y1={yApp} x2={W - pad} y2={yApp} stroke="#C94A4A" strokeDasharray="4 3" strokeWidth="1" />
      <text x={W - pad} y={yApp - 4} textAnchor="end" className="fill-[#C94A4A] text-[9px]">approprié</text>
      {/* séries : plan (sarcelle clair), engagé (bleu), réalisé (sarcelle) */}
      <path d={path('planCumul')} fill="none" stroke="#235A6E" strokeOpacity="0.35" strokeWidth="2" />
      <path d={path('engageCumul')} fill="none" stroke="#3D6FA8" strokeWidth="2" />
      <path d={path('realiseCumul')} fill="none" stroke="#235A6E" strokeWidth="2.5" />
      {MOIS.map((m, i) => <text key={i} x={x(i)} y={H - pad + 14} textAnchor="middle" className="fill-neutral-400 text-[9px]">{m}</text>)}
    </svg>
  );
};

const ProjetCockpitPage: React.FC = () => {
  const { id = '' } = useParams();
  const { adapter } = useData();
  const navigate = useNavigate();
  const [projet, setProjet] = useState<CapexProjet | null>(null);
  const [exec, setExec] = useState<ProjetExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comm, setComm] = useState<CommissioningResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const p = await getProjet(adapter, id);
        if (!p) { if (!cancelled) { setError('Projet introuvable.'); setLoading(false); } return; }
        const a = await getDefaultAnnee(adapter);
        const e = await getProjetExecution(adapter, p, a);
        if (cancelled) return;
        setProjet(p); setExec(e);
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, id, refreshKey]);

  const commission = useCallback(async () => {
    setBusy(true); setError(null);
    try { const r = await commissionProject(adapter, id); setComm(r); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || 'Échec mise en service'); } finally { setBusy(false); }
  }, [adapter, id]);

  const reste = useMemo(() => exec ? exec.approprie - exec.engage - exec.realise : 0, [exec]);
  const alerts = useMemo(() => {
    if (!exec || exec.approprie <= 0) return [] as { sev: 'danger' | 'warning'; msg: string }[];
    const out: { sev: 'danger' | 'warning'; msg: string }[] = [];
    if (exec.engage + exec.realise > exec.approprie) out.push({ sev: 'danger', msg: 'CPX-DEP : projection > montant approprié (engagement à bloquer).' });
    else if (exec.engage >= 0.9 * exec.approprie) out.push({ sev: 'warning', msg: 'CPX-ENG-90 : engagé cumulé ≥ 90 % du montant approprié.' });
    return out;
  }, [exec]);

  if (loading) return <div className="flex items-center gap-2 text-neutral-500 py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  if (error || !projet || !exec) return <div className="p-6 text-center text-sm text-neutral-500">{error || 'Projet introuvable.'}</div>;

  const Kpi: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent = 'text-neutral-900 dark:text-white' }) => (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`font-mono text-base font-semibold ${accent}`}>{formatCurrency(value)}</div>
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate('/capex')} className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><Rocket className="w-5 h-5 text-[#235A6E]" /> {projet.code} · {projet.libelle}</h1>
          <p className="text-xs text-neutral-500">statut {projet.statut}{projet.date_mise_en_service_cible && ` · mise en service cible ${projet.date_mise_en_service_cible}`}</p>
        </div>
        <div className="flex-1" />
        {projet.statut === 'en_execution' && (
          <button onClick={commission} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E89A2E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />} Mettre en service
          </button>
        )}
        {projet.statut === 'mis_en_service' && (
          <button onClick={() => navigate(`/capex/pir/${projet.id}`)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#235A6E] text-white text-sm font-medium hover:opacity-90">
            <ClipboardCheck className="w-4 h-4" /> PIR
          </button>
        )}
      </header>

      {comm && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 px-4 py-3 text-sm space-y-1">
          <div className="font-medium text-emerald-700 dark:text-emerald-300">Immobilisation {comm.assetCode} créée (base {formatCurrency(comm.base)}).</div>
          <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 font-mono">
            Écriture à valider en comptabilité : débit {comm.ecriture.debit_account} / crédit {comm.ecriture.credit_account} · {formatCurrency(comm.ecriture.montant)}
          </div>
        </div>
      )}

      {alerts.map((a, i) => (
        <div key={i} className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${a.sev === 'danger' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
          <AlertTriangle className="w-4 h-4" /> {a.msg}
        </div>
      ))}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Approprié" value={exec.approprie} accent="text-[#235A6E] dark:text-[#8fc7d6]" />
        <Kpi label="Engagé" value={exec.engage} accent="text-[#3D6FA8]" />
        <Kpi label="Réalisé" value={exec.realise} />
        <Kpi label="Reste" value={reste} accent={reste < 0 ? 'text-red-600' : 'text-emerald-600'} />
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Courbe en S</h2>
          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#235A6E] opacity-40 inline-block" /> Plan</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#3D6FA8] inline-block" /> Engagé</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#235A6E] inline-block" /> Réalisé</span>
          </div>
        </div>
        <SCurve exec={exec} />
      </div>
    </div>
  );
};

export default ProjetCockpitPage;
