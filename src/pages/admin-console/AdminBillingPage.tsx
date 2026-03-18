// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Clock, AlertTriangle, DollarSign, Filter, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validatePayment } from '../../features/platform/services/adminService';
import { toast } from 'react-hot-toast';

const AdminBillingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices', statusFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('invoices')
        .select('*, tenant:tenants(name, billing_email)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data } = await q;
      if (search) {
        return (data || []).filter((inv: any) =>
          inv.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
          inv.payment_reference?.toLowerCase().includes(search.toLowerCase())
        );
      }
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-billing-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('amount, status');
      const all = data || [];
      return {
        totalPaid: all.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0),
        totalPending: all.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0),
        countPending: all.filter(i => i.status === 'pending').length,
        countPaid: all.filter(i => i.status === 'paid').length,
      };
    },
  });

  const validateMut = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) => validatePayment(id, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-billing-stats'] });
      toast.success('Paiement validé — licence activée');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('invoices').update({ status: 'failed' }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      toast.success('Paiement rejeté');
    },
  });

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#0f172a]">Gestion des paiements</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Encaissé', value: `${fmt(stats?.totalPaid || 0)} FCFA`, icon: CheckCircle, color: '#059669' },
          { label: 'En attente', value: `${fmt(stats?.totalPending || 0)} FCFA`, icon: Clock, color: '#d97706' },
          { label: 'Factures payées', value: stats?.countPaid || 0, icon: DollarSign, color: '#2563eb' },
          { label: 'À valider', value: stats?.countPending || 0, icon: AlertTriangle, color: stats?.countPending ? '#dc2626' : '#059669' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
            <div className="text-2xl font-bold text-[#0f172a]">{k.value}</div>
            <div className="text-xs text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher tenant ou référence..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="paid">Payées</option>
          <option value="failed">Échouées</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Tenant', 'Montant', 'Méthode', 'Référence', 'Statut', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Aucune facture</td></tr>
            ) : invoices.map((inv: any) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-[#0f172a]">{inv.tenant?.name || '—'}</td>
                <td className="px-5 py-3 font-semibold">{fmt(inv.amount)} {inv.currency}</td>
                <td className="px-5 py-3 text-gray-500">{inv.payment_method || '—'}</td>
                <td className="px-5 py-3 text-xs text-gray-400 font-mono">{inv.payment_reference || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>{inv.status}</span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-5 py-3">
                  {inv.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const ref = prompt('Référence du paiement :');
                        if (ref) validateMut.mutate({ id: inv.id, ref });
                      }} className="text-xs text-green-700 font-semibold hover:underline">Valider</button>
                      <button onClick={() => rejectMut.mutate(inv.id)}
                        className="text-xs text-red-600 font-semibold hover:underline">Rejeter</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBillingPage;
