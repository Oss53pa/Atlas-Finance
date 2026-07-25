/**
 * Rentabilité par client — cost-to-serve, marge nette & statut (CDC §8.1).
 *
 * Le CA est lu du grand livre par écriture (client sur la 411 → produits 70x de
 * la même pièce). La cascade : CA − coût direct (analytique) = marge brute ;
 * − quote-part de charges indirectes (réparties au prorata du CA, clé V1) =
 * MARGE NETTE, d'où le statut RENTABLE / À SURVEILLER / DÉFICITAIRE.
 *
 * Vision cumulée (CDC) : Exercice / YTD / 12 mois glissants. Le statut officiel
 * DÉFICITAIRE n'est porté qu'en 12 mois glissants ; en période, une marge
 * négative n'est qu'un signal À SURVEILLER.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Search, AlertTriangle, TrendingUp, Link2, LineChart } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { cumulRange, CUMUL_VIEWS as VIEWS, type CumulView } from '../../utils/cumulRange';
import {
  getClientRevenue, withCostToServe, buildWhaleCurve,
  type ClientNet, type ClientStatut, type WhalePoint,
} from '../../services/tiers/clientProfitability';

const STATUT_STYLE: Record<ClientStatut, { label: string; cls: string }> = {
  RENTABLE: { label: 'Rentable', cls: 'bg-green-100 text-green-700' },
  A_SURVEILLER: { label: 'À surveiller', cls: 'bg-amber-100 text-amber-800' },
  DEFICITAIRE: { label: 'Déficitaire', cls: 'bg-red-100 text-red-700' },
};

const RentabiliteClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CumulView>('exercice');
  const [refYear, setRefYear] = useState('');
  const [clients, setClients] = useState<ClientNet[]>([]);
  const [meta, setMeta] = useState<{ caTotal: number; pctAffecte: number; caNonAffecte: number; ecrituresSansClient: number; indirectPool: number }>({ caTotal: 0, pctAffecte: 0, caNonAffecte: 0, ecrituresSansClient: 0, indirectPool: 0 });
  const [search, setSearch] = useState('');

  const load = useCallback(async (v: CumulView) => {
    setLoading(true);
    try {
      const year = refYear || await getDefaultAnnee(adapter);
      setRefYear(year);
      const report = await getClientRevenue(adapter, undefined, cumulRange(v, year));
      const { clients: net, indirectPool } = withCostToServe(report, v);
      setClients(net);
      setMeta({ caTotal: report.caTotal, pctAffecte: report.pctAffecte, caNonAffecte: report.caNonAffecte, ecrituresSansClient: report.ecrituresSansClient, indirectPool });
    } catch (e) {
      toast.error(`Chargement impossible : ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [adapter, refYear]);

  useEffect(() => { void load(view); /* eslint-disable-next-line */ }, [adapter, view]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => !q || `${c.code} ${c.name}`.toLowerCase().includes(q));
  }, [clients, search]);

  const whale = useMemo(() => buildWhaleCurve(clients), [clients]);
  const coutRenseigne = useMemo(() => clients.some(c => c.coutDirect !== 0), [clients]);
  const nbDeficitaires = useMemo(() => clients.filter(c => c.code && c.statut === 'DEFICITAIRE').length, [clients]);
  const margeNetteTotale = useMemo(() => clients.filter(c => c.code).reduce((s, c) => s + c.margeNette, 0), [clients]);

  return (
    <div className="p-6 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tiers')} className="p-2 rounded-lg hover:bg-gray-100" title="Retour au tableau de bord Tiers">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" /> Rentabilité par client
            </h1>
            <p className="text-sm text-gray-600">Coût complet (cost-to-serve) et marge nette, lus du grand livre · exercice {refYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {VIEWS.map(v => (
              <button key={v.key} onClick={() => setView(v.key)} className={`px-3 py-1.5 text-sm ${view === v.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{v.label}</button>
            ))}
          </div>
          <button onClick={() => void load(view)} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger
          </button>
        </div>
      </div>

      {/* Couverture du rattachement client */}
      {meta.caTotal > 0 && meta.pctAffecte < 100 && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <span className="font-semibold">{meta.pctAffecte}% du CA est rattaché à un client.</span>{' '}
            {formatCurrency(Math.abs(meta.caNonAffecte))} de produits ({meta.ecrituresSansClient} écriture(s)) sans client identifiable.
            <button onClick={() => navigate('/tiers/rattachement')} className="ml-1 underline font-medium inline-flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> rattacher les lignes 411</button>
          </div>
        </div>
      )}

      {/* Méthode cost-to-serve */}
      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900">
        <span className="font-semibold">Cost-to-serve (V1).</span>{' '}
        La quote-part indirecte répartit {formatCurrency(meta.indirectPool)} de charges de classe 6 non directement affectées, au prorata du CA de chaque client.
        {!coutRenseigne && ' Le coût direct est à zéro tant qu\'aucune charge ne porte de code analytique client — la marge brute reste alors égale au CA.'}
        {' '}La maille la plus fine est le client (la marge par article exige les lignes de facture, V2+).
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <p className="text-xs text-gray-500">CA total ({VIEWS.find(v => v.key === view)?.label})</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(meta.caTotal)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <p className="text-xs text-gray-500">Marge nette totale</p>
          <p className={`text-lg font-semibold ${margeNetteTotale >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(margeNetteTotale)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <p className="text-xs text-gray-500">Clients avec CA</p>
          <p className="text-lg font-semibold text-gray-900">{clients.filter(c => c.code && c.ca !== 0).length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <p className="text-xs text-gray-500">Clients déficitaires</p>
          <p className={`text-lg font-semibold ${nbDeficitaires > 0 ? 'text-red-600' : 'text-gray-900'}`}>{nbDeficitaires}</p>
        </div>
      </div>

      {/* Courbe en baleine */}
      {whale.length > 1 && <WhaleCurve points={whale} />}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Client, code…" className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-72" />
      </div>

      {/* Tableau */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Client</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">CA réalisé</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Coût direct</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Quote-part indirecte</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Marge nette</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">%</th>
              <th className="text-center px-3 py-2 font-medium text-gray-700">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Aucun CA sur la période.</td></tr>}
            {!loading && rows.map(c => {
              const nonAffecte = c.code === '';
              const st = STATUT_STYLE[c.statut];
              return (
                <tr key={c.code || '__none__'} className={`border-b border-gray-100 ${nonAffecte ? 'bg-amber-50/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2">
                    {nonAffecte ? <span className="text-amber-800 italic">{c.name}</span> : <><span className="font-mono text-gray-500">{c.code}</span> <span className="text-gray-800">{c.name}</span></>}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{formatCurrency(c.ca)}</td>
                  <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{c.coutDirect !== 0 ? formatCurrency(c.coutDirect) : '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{nonAffecte ? '—' : formatCurrency(c.quotePartIndirecte)}</td>
                  <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${c.margeNette >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(c.margeNette)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{c.ca !== 0 ? `${c.margeNettePct}%` : '—'}</td>
                  <td className="px-3 py-2 text-center">{nonAffecte ? <span className="text-gray-300">—</span> : <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** Courbe en baleine : marge cumulée (clients triés par marge décroissante). */
const WhaleCurve: React.FC<{ points: WhalePoint[] }> = ({ points }) => {
  const W = 720, H = 160, PAD = 8;
  const peak = Math.max(...points.map(p => p.cumulMarge), 1);
  const floor = Math.min(...points.map(p => p.cumulMarge), 0);
  const span = peak - floor || 1;
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - floor) / span) * (H - 2 * PAD);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.cumulMarge).toFixed(1)}`).join(' ');
  const peakIdx = points.reduce((best, p, i) => (p.cumulMarge > points[best].cumulMarge ? i : best), 0);
  const zeroY = y(0);
  return (
    <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
      <div className="flex items-center gap-2 mb-2"><LineChart className="w-4 h-4 text-[var(--color-primary)]" /><h2 className="font-semibold text-gray-800 text-sm">Courbe en baleine — marge nette cumulée</h2></div>
      <p className="text-xs text-gray-500 mb-2">Clients classés par marge décroissante. Le sommet = marge maximale atteignable ; la pente descendante = clients qui détruisent de la marge.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }} preserveAspectRatio="none">
        <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 3" />
        <path d={`${path} L${x(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`} fill="var(--color-primary)" opacity={0.08} />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
        <circle cx={x(peakIdx)} cy={y(points[peakIdx].cumulMarge)} r={3.5} fill="var(--color-primary)" />
      </svg>
      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
        <span>Sommet : {formatCurrency(points[peakIdx].cumulMarge)} au client #{peakIdx + 1}</span>
        <span>{points.length} clients</span>
      </div>
    </div>
  );
};

export default RentabiliteClientPage;
