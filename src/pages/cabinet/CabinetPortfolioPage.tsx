/**
 * CabinetPortfolioPage — portefeuille multi-dossiers du cabinet.
 *
 * Vue cross-tenant : tous les dossiers clients de l'utilisateur avec leurs KPI
 * (exercice, statut de clôture, écritures, résultat), et ouverture en un clic.
 * L'agrégation est faite côté serveur (Edge Function cabinet-portfolio).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Loader2, RefreshCw, FolderOpen, Lock, LockOpen, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import toast from 'react-hot-toast';
import {
  getCabinetPortfolio,
  portfolioSummary,
  switchToDossier,
  type CabinetDossier,
} from '../../services/cabinet/cabinetPortfolioService';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const CabinetPortfolioPage: React.FC = () => {
  const { adapter } = useData();
  const [dossiers, setDossiers] = useState<CabinetDossier[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const p = await getCabinetPortfolio(adapter);
      setDossiers(p.dossiers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
      setDossiers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const summary = useMemo(() => portfolioSummary(dossiers ?? []), [dossiers]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#235A6E]" /> Portefeuille de dossiers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vos sociétés clientes et leurs indicateurs — ouverture en un clic
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Actualiser
        </button>
      </div>

      {/* Synthèse */}
      {dossiers && dossiers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Dossiers" value={String(summary.nbDossiers)} />
          <Kpi label="Exercices ouverts" value={String(summary.ouverts)} />
          <Kpi label="Clôturés" value={String(summary.clotures)} />
          <Kpi label="Résultat cumulé" value={fmt(summary.resultatCumule)} tone={summary.resultatCumule >= 0 ? 'ok' : 'bad'} />
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {loading && !dossiers ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : dossiers && dossiers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">
          Aucun dossier dans votre portefeuille. (En mode local, la vue portefeuille
          n'est pas disponible — elle agrège plusieurs sociétés côté serveur.)
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {dossiers?.map(d => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{d.nom}</div>
                  <div className="text-xs text-gray-500">{d.code ?? ''}{d.pays ? ` · ${d.pays}` : ''} · {d.role}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                  d.exercice?.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {d.exercice?.isClosed ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                  {d.exercice?.isClosed ? 'clôturé' : 'ouvert'}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm flex-1">
                <RowMini label="Exercice" value={d.exercice?.name ?? '—'} />
                <RowMini label="Écritures" value={fmt(d.entries)} />
                <RowMini label="Dernière activité" value={d.lastActivity ?? '—'} />
                <RowMini label="Résultat" value={fmt(d.resultat)} tone={d.resultat >= 0 ? 'ok' : 'bad'} />
              </div>

              <button
                onClick={async () => {
                  try { await switchToDossier(adapter, d.id); }
                  catch (e) { toast.error(e instanceof Error ? e.message : 'Bascule impossible'); }
                }}
                className="mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b]">
                <FolderOpen className="w-4 h-4" /> Ouvrir le dossier
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; tone?: 'ok' | 'bad' }> = ({ label, value, tone }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-lg font-bold tabular-nums ${tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
  </div>
);

const RowMini: React.FC<{ label: string; value: string; tone?: 'ok' | 'bad' }> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-500">{label}</span>
    <span className={`tabular-nums text-sm ${tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-700'}`}>{value}</span>
  </div>
);

export default CabinetPortfolioPage;
