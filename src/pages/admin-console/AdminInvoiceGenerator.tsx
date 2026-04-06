// @ts-nocheck

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const AdminInvoiceGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ tenantId: '', description: '', amount: '', currency: 'XOF', periodStart: '', periodEnd: '', paymentMethod: 'virement' });
  const [loading, setLoading] = useState(false);

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin-tenants-list'],
    queryFn: async () => { const { data } = await supabase.from('tenants').select('id, name').order('name'); return data || []; },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');
  const amount = Number(form.amount) || 0;

  const handleGenerate = async () => {
    if (!form.tenantId || !amount) { toast.error('Tenant et montant obligatoires'); return; }
    setLoading(true);
    try {
      const num = `AS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('invoices').insert({
        tenant_id: form.tenantId,
        invoice_number: num,
        amount,
        currency: form.currency,
        status: 'pending',
        payment_method: form.paymentMethod,
        period_start: form.periodStart || null,
        period_end: form.periodEnd || null,
      });
      if (error) throw new Error(error.message);
      toast.success(`Facture ${num} générée`);
      navigate('/admin-console/billing');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h1 className="text-xl font-bold text-[#0f172a] flex items-center gap-2"><FileText className="w-5 h-5" /> Générer une facture manuelle</h1>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
          <select value={form.tenantId} onChange={e => set('tenantId', e.target.value)} className="w-full border rounded-xl px-4 py-2.5 text-sm">
            <option value="">— Sélectionner —</option>
            {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Contrat spécial, régularisation..." className="w-full border rounded-xl px-4 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className="w-full border rounded-xl px-4 py-2.5 text-sm">
              <option>XOF</option><option>XAF</option><option>EUR</option><option>USD</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Début période</label><input type="date" value={form.periodStart} onChange={e => set('periodStart', e.target.value)} className="w-full border rounded-xl px-4 py-2.5 text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fin période</label><input type="date" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} className="w-full border rounded-xl px-4 py-2.5 text-sm" /></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
          <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="w-full border rounded-xl px-4 py-2.5 text-sm">
            <option value="virement">Virement</option><option value="mobile_money">Mobile Money</option><option value="card">Carte</option><option value="bon_commande">Bon de commande</option>
          </select>
        </div>
      </div>

      {amount > 0 && (
        <div className="bg-gray-50 rounded-xl border p-4 text-center">
          <div className="text-xs text-gray-500">Total facture</div>
          <div className="text-2xl font-bold text-[#0f172a]">{fmt(amount)} {form.currency}</div>
        </div>
      )}

      <button onClick={handleGenerate} disabled={loading || !form.tenantId || !amount}
        className="w-full py-3 bg-[#0f172a] text-white rounded-xl font-semibold text-sm hover:bg-[#1e293b] disabled:opacity-50 flex items-center justify-center gap-2">
        <Send className="w-4 h-4" /> {loading ? 'Génération...' : 'Générer la facture'}
      </button>
    </div>
  );
};

export default AdminInvoiceGenerator;
