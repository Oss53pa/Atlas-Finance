
import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard, Download, CheckCircle, Clock, AlertTriangle,
  ArrowRight, Calendar, Receipt, Zap
} from 'lucide-react';
import { getInvoices } from '../../features/platform/services/tenantService';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  paid: { label: 'Payée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-orange-100 text-orange-700', icon: Clock },
  failed: { label: 'Échouée', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-500', icon: null },
};

const ClientBilling: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, subscriptions } = useOutletContext<any>();

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', tenant?.id],
    queryFn: () => getInvoices(tenant.id),
    enabled: !!tenant?.id,
  });

  const activeSubs = subscriptions.filter((s: any) => s.status === 'active' || s.status === 'trialing');
  const totalMRR = activeSubs.reduce((sum: number, s: any) => sum + (s.solution?.price_monthly_xof || 0), 0);

  const formatXOF = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-primary)]">Facturation & Abonnement</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos abonnements et consultez vos factures</p>
      </div>

      {/* Plan actuel */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[var(--color-primary)] flex items-center gap-2">
            <Zap className="w-5 h-5" /> Plan actuel
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tenant?.status === 'trial' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {tenant?.status === 'trial' ? 'Essai gratuit' : 'Actif'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Coût mensuel</div>
            <div className="text-xl font-bold text-[var(--color-primary)]">{formatXOF(totalMRR)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Solutions actives</div>
            <div className="text-xl font-bold text-[var(--color-primary)]">{activeSubs.length}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Prochain renouvellement</div>
            <div className="text-xl font-bold text-[var(--color-primary)]">
              {activeSubs[0]?.current_period_end ? new Date(activeSubs[0].current_period_end).toLocaleDateString('fr-FR') : '—'}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => navigate('/solutions')} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[#333] flex items-center gap-1">
            Changer de plan <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Solutions abonnées */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Solutions actives</h3>
        </div>
        <div className="divide-y">
          {activeSubs.map((sub: any) => (
            <div key={sub.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-[var(--color-primary)]">{sub.solution?.name || sub.solution_id}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {sub.status === 'trialing' ? 'Essai gratuit' : 'Actif'} · {formatXOF(sub.solution?.price_monthly_xof || 0)}/mois
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${sub.status === 'trialing' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {sub.status === 'trialing' ? 'Essai' : 'Actif'}
              </span>
            </div>
          ))}
          {activeSubs.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Aucun abonnement actif</div>
          )}
        </div>
      </div>

      {/* Historique factures */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Historique des factures
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              {['N° Facture', 'Période', 'Montant', 'Statut', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left font-medium text-gray-500 text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Aucune facture</td></tr>
            ) : invoices.map((inv: any) => {
              const st = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-[var(--color-primary)]">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {inv.period_start ? `${new Date(inv.period_start).toLocaleDateString('fr-FR')} — ${new Date(inv.period_end).toLocaleDateString('fr-FR')}` : '—'}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[var(--color-primary)]">{formatXOF(inv.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 inline-flex">
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientBilling;
