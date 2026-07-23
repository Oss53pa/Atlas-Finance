/**
 * Rentabilité par client — CA réalisé et cascade de marges.
 *
 * Répond à « ce client est-il rentable ? ». Le CA est lu du grand livre par
 * l'écriture (client sur la 411 → produits 70x de la même pièce), pas par un
 * tag sur les comptes de produits. La couverture progresse à mesure que les
 * lignes 411 sont rattachées (écran /tiers/rattachement).
 *
 * Le coût direct n'est attribué au client que via l'analytique (chantier/projet
 * dédié) ; tant qu'aucune charge n'y est rattachée, la page l'affiche
 * honnêtement à zéro et signale que la marge n'est encore que du CA.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Search, AlertTriangle, TrendingUp, Link2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getClientRevenue, type ClientRevenueReport } from '../../services/tiers/clientProfitability';

const RentabiliteClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ClientRevenueReport | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getClientRevenue(adapter));
    } catch (e) {
      toast.error(`Chargement impossible : ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.clients.filter(c => !q || `${c.code} ${c.name}`.toLowerCase().includes(q));
  }, [report, search]);

  // Le coût direct n'est renseigné que si des charges portent un code analytique.
  const coutRenseigne = useMemo(
    () => (report?.clients || []).some(c => c.coutDirect !== 0),
    [report],
  );

  return (
    <div className="p-6 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tiers')} className="p-2 rounded-lg hover:bg-gray-100" title="Retour au tableau de bord Tiers">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" /> Rentabilité par client
            </h1>
            <p className="text-sm text-gray-600">
              CA réalisé et marge brute directe, lus du grand livre par écriture.
            </p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger
        </button>
      </div>

      {/* Couverture : le CA rattachable à un client */}
      {report && report.caTotal > 0 && report.pctAffecte < 100 && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <span className="font-semibold">{report.pctAffecte}% du CA est rattaché à un client.</span>{' '}
            {formatCurrency(Math.abs(report.caNonAffecte))} de produits ({report.ecrituresSansClient} écriture(s))
            sans client identifiable — provisions de cut-off (sans client par nature) et ventes dont la
            ligne 411 n'a pas encore de tiers.
            <button onClick={() => navigate('/tiers/rattachement')} className="ml-1 underline font-medium inline-flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" /> rattacher les lignes 411
            </button>
          </div>
        </div>
      )}

      {/* Méthode : marge brute encore = CA tant que le coût n'est pas attribué */}
      {report && !coutRenseigne && report.caAffecte > 0 && (
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900">
          <span className="font-semibold">Marge = CA pour l'instant.</span>{' '}
          Aucune charge n'est encore attribuée à un client. L'attribution du coût des ventes passe par
          l'analytique (une section « chantier/projet » dédiée au client, saisie sur les lignes de charges) —
          voir Contrôle de gestion › Analytique. La cascade « marge après coûts directs » puis « marge nette »
          se remplira au fur et à mesure.
        </div>
      )}

      {/* KPIs */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-gray-500">CA total (réalisé)</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(report.caTotal)}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-gray-500">CA rattaché à un client</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(report.caAffecte)}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-gray-500">Clients avec CA</p>
            <p className="text-lg font-semibold text-gray-900">{report.clients.filter(c => c.code && c.ca !== 0).length}</p>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Client, code…"
          className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-72"
        />
      </div>

      {/* Tableau */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Client</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">CA réalisé</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Coût direct</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Marge brute</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">%</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Écritures</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Aucun CA sur la période.</td></tr>
            )}
            {!loading && rows.map(c => {
              const nonAffecte = c.code === '';
              return (
                <tr key={c.code || '__none__'} className={`border-b border-gray-100 ${nonAffecte ? 'bg-amber-50/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2">
                    {nonAffecte ? (
                      <span className="text-amber-800 italic">{c.name}</span>
                    ) : (
                      <><span className="font-mono text-gray-500">{c.code}</span> <span className="text-gray-800">{c.name}</span></>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{formatCurrency(c.ca)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">
                    {c.coutDirect !== 0 ? formatCurrency(c.coutDirect) : '—'}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${c.margeBrute >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(c.margeBrute)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{c.coutDirect !== 0 ? `${c.margeBrutePct}%` : '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{c.nbEcritures}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RentabiliteClientPage;
