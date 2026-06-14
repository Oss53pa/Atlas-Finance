/**
 * BudgetInvestissementPage — /budget/investissement (CDC V3 §6).
 * CAPEX par compte : budgété / réalisé / écart / reste à engager. Vue live
 * v_actual_investment (classe 2) — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { KPICard, ColorfulBarChart } from '../../components/ui/DesignSystem';
import {
  getDefaultAnnee, getInvestmentSummary, listCapexRequests, setCapexStatut, deleteCapexRequest,
  dotationAnnuelle, type InvestmentSummary, type CapexRequest,
} from '../../features/budget/services/budgetService';
import CapexRequestModal from './CapexRequestModal';
import { useToast } from '../../hooks/useToast';
import { ArrowLeft, Package, Wallet, TrendingUp, Hourglass, Plus, Trash2, Check, Ban, Banknote, Lock, Eye, Pencil } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const CAR_BADGE: Record<string, string> = {
  demande: 'bg-gray-100 text-gray-700',
  approuve: 'bg-blue-100 text-blue-700',
  fonds_disponibles: 'bg-green-100 text-green-700',
  clos: 'bg-amber-100 text-amber-800',
  rejete: 'bg-red-100 text-red-700',
};
const CAR_LABEL: Record<string, string> = {
  demande: 'Demande', approuve: 'Validé', fonds_disponibles: 'Fonds dispo.', clos: 'Clôturé', rejete: 'Rejeté',
};

const BudgetInvestissementPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [annee, setAnnee] = useState('');
  const [tab, setTab] = useState<'synthese' | 'demandes' | 'detail'>('synthese');
  const [sum, setSum] = useState<InvestmentSummary | null>(null);
  const [requests, setRequests] = useState<CapexRequest[]>([]);
  const [showCar, setShowCar] = useState(false);
  const [editingCar, setEditingCar] = useState<CapexRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const [s, reqs] = await Promise.all([getInvestmentSummary(adapter, a), listCapexRequests(adapter)]);
        if (cancelled) return;
        setAnnee(a); setSum(s); setRequests(reqs);
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const carAction = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); setRefreshKey(k => k + 1); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const chart = useMemo(() => (sum?.mensuel || []).map((m, i) => ({ label: MOIS[i], value: Math.round(m.realise / 1000), color: '' })), [sum]);
  const carStats = useMemo(() => {
    const sumBy = (st: string[]) => requests.filter(r => st.includes(r.statut)).reduce((s, r) => s + r.montant, 0);
    return {
      demande: sumBy(['demande']),
      valide: sumBy(['approuve']),
      fonds: sumBy(['fonds_disponibles', 'clos']),
    };
  }, [requests]);

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement…</div>;
  if (error) return <div className="p-8"><div className="bg-[var(--color-error-light,#FEECEC)] text-[var(--color-error)] rounded-lg p-4 text-sm">{error}</div></div>;

  const s = sum!;
  const resteTotal = Math.max(0, s.totalBudget - s.totalRealise);
  const taux = s.totalBudget !== 0 ? Math.round((s.totalRealise / s.totalBudget) * 100) : null;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Package className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Investissement (CAPEX)</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Immobilisations classe 2 · Exercice {annee}</p>
        </div>
        <button onClick={() => setShowCar(true)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"><Plus className="w-4 h-4" />Nouvelle demande CAPEX</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="CAPEX réalisé" value={formatCurrency(s.totalRealise)} icon={TrendingUp} color="primary" valueFontSize="1.125rem" />
        <KPICard title="CAPEX budgété" value={formatCurrency(s.totalBudget)} icon={Wallet} color="neutral" valueFontSize="1.125rem" />
        <KPICard title="Taux d'engagement" value={taux != null ? `${taux}%` : '—'} icon={TrendingUp} color="success" />
        <KPICard title="Reste à engager" value={formatCurrency(resteTotal)} icon={Hourglass} color="warning" valueFontSize="1.125rem" />
      </div>

      {/* Onglets : Synthèse / Demandes CAPEX (CAR) / Détail par compte */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-[var(--color-border)] shadow-sm w-fit">
        {([['synthese', 'Synthèse'], ['demandes', `Demandes CAPEX (${requests.length})`], ['detail', `Détail par compte (${s.parCompte.length})`]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === k ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{lbl}</button>
        ))}
      </div>

      <CapexRequestModal open={showCar} onClose={() => setShowCar(false)} onCreated={() => setRefreshKey(k => k + 1)} />
      <CapexRequestModal open={!!editingCar} editing={editingCar} onClose={() => setEditingCar(null)} onCreated={() => setRefreshKey(k => k + 1)} />

      {tab === 'demandes' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--color-primary)]">Demandes d'investissement (CAR)</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">Workflow : demande motivée → validation → mise à disposition des fonds → utilisation.</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="text-right"><div className="text-gray-400">En demande</div><div className="font-semibold text-gray-700">{formatCurrency(carStats.demande)}</div></div>
              <div className="text-right"><div className="text-gray-400">Validé</div><div className="font-semibold text-blue-700">{formatCurrency(carStats.valide)}</div></div>
              <div className="text-right"><div className="text-gray-400">Fonds dispo.</div><div className="font-semibold text-green-700">{formatCurrency(carStats.fonds)}</div></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Projet / Bien</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Compte</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Date prév.</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Durée</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Dotation/an</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Aucune demande. Cliquez « Nouvelle demande CAPEX ».</td></tr>}
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">{r.libelle}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{r.account_code}</span></td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(r.montant)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{r.date_prevue || '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{r.duree_amortissement ? `${r.duree_amortissement} ans` : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 text-xs">{formatCurrency(dotationAnnuelle(r))}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAR_BADGE[r.statut]}`}>{CAR_LABEL[r.statut]}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingCar(r)} title={(r.statut === 'fonds_disponibles' || r.statut === 'clos') ? 'Consulter le détail' : 'Voir / modifier'} className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1 text-gray-600">
                          {(r.statut === 'fonds_disponibles' || r.statut === 'clos') ? <><Eye className="w-3 h-3" />Voir</> : <><Pencil className="w-3 h-3" />Détail</>}
                        </button>
                        {r.statut === 'demande' && <>
                          <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'approuve'), 'Demande validée')} title="Valider la demande" className="px-2 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><Check className="w-3 h-3" />Valider</button>
                          <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'rejete'), 'Demande rejetée')} title="Rejeter" className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1"><Ban className="w-3 h-3" />Rejeter</button>
                        </>}
                        {r.statut === 'approuve' && <>
                          <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'fonds_disponibles'), 'Fonds mis à disposition')} title="Mettre les fonds à disposition" className="px-2 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"><Banknote className="w-3 h-3" />Mettre les fonds à dispo.</button>
                          <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'rejete'), 'Demande rejetée')} title="Rejeter" className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1"><Ban className="w-3 h-3" />Rejeter</button>
                        </>}
                        {r.statut === 'fonds_disponibles' && <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'clos'), 'Demande clôturée')} title="Clôturer (fonds utilisés)" className="px-2 py-1 text-xs rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1"><Lock className="w-3 h-3" />Clôturer</button>}
                        {r.statut === 'rejete' && <button onClick={() => carAction(() => setCapexStatut(adapter, r.id, 'demande'), 'Réactivée')} className="px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50">Réactiver</button>}
                        <button onClick={() => { if (window.confirm('Supprimer cette demande ?')) carAction(() => deleteCapexRequest(adapter, r.id), 'Supprimée'); }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'synthese' && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-1">CAPEX mensuel réalisé</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">En milliers FCFA</p>
          {chart.some(d => d.value !== 0) ? <ColorfulBarChart data={chart} height={220} /> : <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">Aucune acquisition sur l'exercice.</div>}
        </div>
      )}

      {tab === 'detail' && (
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">Détail par compte d'immobilisation</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Compte</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600" title="Solde issu des À-Nouveaux : déjà immobilisé en comptabilité">Déjà en compte</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600" title="Acquisitions de la période (hors À-Nouveaux)">Nouveaux invest.</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budgété</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Reste à engager</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {s.parCompte.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune immobilisation.</td></tr>}
            {s.parCompte.map(c => (
              <tr key={c.account_code} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/accounting/general-ledger?compte=${c.account_code}`)}>
                <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{c.account_code}</span> <span className="text-gray-800">{c.label}</span></td>
                <td className="px-4 py-2.5 text-right text-gray-400">{c.existant ? formatCurrency(c.existant) : '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{c.nouveau ? formatCurrency(c.nouveau) : '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{c.budget ? formatCurrency(c.budget) : '—'}</td>
                <td className={`px-4 py-2.5 text-right ${c.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.budget ? formatCurrency(c.ecart) : '—'}</td>
                <td className="px-4 py-2.5 text-right text-amber-700">{c.budget ? formatCurrency(c.resteAEngager) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default BudgetInvestissementPage;
