/**
 * Initialisation du paramétrage standard (CDC Paramètres §22, critère #6).
 *
 * Vérifie et complète le paramétrage minimal du tenant courant (plan analytique,
 * conditions de paiement, rôles standard) — same-tenant, non destructif.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Rocket, CheckCircle, Circle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getBootstrapStatus, runBootstrap, type BootstrapStatus, type BootstrapReport } from '../../services/param/paramBootstrapService';

const BootstrapPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [status, setStatus] = useState<BootstrapStatus | null>(null);
  const [report, setReport] = useState<BootstrapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getBootstrapStatus(adapter)); }
    catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { void load(); }, [load]);

  const run = async () => {
    setBusy(true); setReport(null);
    try { const r = await runBootstrap(adapter); setReport(r); toast.success('Paramétrage standard initialisé'); await load(); }
    catch (e) { toast.error(`Échec : ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  const line = (ok: boolean, label: string, detail: string) => (
    <div className="flex items-center gap-2 py-2">
      {ok ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-amber-500" />}
      <span className="text-gray-800">{label}</span>
      <span className="text-xs text-gray-400">{detail}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Rocket className="w-5 h-5 text-[var(--color-primary)]" /> Initialisation du paramétrage</h1>
            <p className="text-sm text-gray-600">Complète le paramétrage standard manquant du tenant</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white divide-y divide-gray-100">
        {loading && <div className="py-4 text-center text-gray-500">Chargement…</div>}
        {!loading && status && (<>
          {line(status.hasPlan, 'Plan analytique', status.hasPlan ? 'présent' : 'à créer (PRINCIPAL)')}
          {line(status.nbConditions > 0, 'Conditions de paiement', status.nbConditions > 0 ? `${status.nbConditions} présente(s)` : '5 standard à créer')}
          {line(status.nbRoles > 0, 'Rôles standard', status.nbRoles > 0 ? `${status.nbRoles} défini(s)` : '8 rôles standard à créer')}
        </>)}
      </div>

      {status && (
        status.missing.length === 0
          ? <div className="p-3 rounded-lg border border-green-300 bg-green-50 text-sm text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" />Le paramétrage standard est complet.</div>
          : <button onClick={run} disabled={busy} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              <Rocket className="w-4 h-4" />{busy ? 'Initialisation…' : `Initialiser (${status.missing.length} bloc(s) manquant(s))`}
            </button>
      )}

      {report && (
        <div className="text-sm text-gray-600 border border-gray-200 rounded-lg p-3 bg-gray-50">
          Créé : {report.plan ? 'plan analytique · ' : ''}{report.conditions > 0 ? `${report.conditions} conditions · ` : ''}{report.roles > 0 ? `${report.roles} rôles` : ''}{!report.plan && !report.conditions && !report.roles ? 'rien (déjà complet)' : ''}
        </div>
      )}
      <p className="text-xs text-gray-500">Opération idempotente et non destructive : n'écrase aucune donnée existante, complète seulement ce qui manque.</p>
    </div>
  );
};

export default BootstrapPage;
