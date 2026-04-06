
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Building, Calendar, Shield, Save, CheckCircle } from 'lucide-react';
import { updateTenant } from '../../features/platform/services/tenantService';
import { toast } from 'react-hot-toast';

const ClientSettings: React.FC = () => {
  const { tenant, isSuperAdmin } = useOutletContext<any>();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: tenant?.name || '',
    rccm: tenant?.rccm || '',
    country: tenant?.country || 'CI',
    currency: tenant?.currency || 'XOF',
    legal_form: tenant?.legal_form || '',
    billing_email: tenant?.billing_email || '',
  });

  const saveMut = useMutation({
    mutationFn: () => updateTenant(tenant.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tenant'] });
      toast.success('Paramètres enregistrés');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#171717]">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Configuration de votre organisation</p>
      </div>

      {/* Informations entreprise */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-[#171717] flex items-center gap-2">
          <Building className="w-5 h-5" /> Informations entreprise
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RCCM</label>
            <input value={form.rccm} onChange={e => set('rccm', e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
            <input value={form.country} onChange={e => set('country', e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
            <input value={form.currency} onChange={e => set('currency', e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
            <input value={form.legal_form} onChange={e => set('legal_form', e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email facturation</label>
            <input type="email" value={form.billing_email} onChange={e => set('billing_email', e.target.value)}
              className="w-full border rounded-xl px-4 py-2.5 text-sm" />
          </div>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
          className="px-5 py-2.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> Enregistrer
        </button>
      </div>

      {/* Sécurité */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-[#171717] flex items-center gap-2">
          <Shield className="w-5 h-5" /> Sécurité
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium">Authentification MFA</div>
              <div className="text-xs text-gray-500">Double authentification par OTP</div>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-500 rounded-full">Bientôt</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium">Sessions actives</div>
              <div className="text-xs text-gray-500">Gérer les appareils connectés</div>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-500 rounded-full">Bientôt</span>
          </div>
        </div>
      </div>

      {/* Infos tenant */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 space-y-1">
        <div>ID Organisation : <span className="font-mono">{tenant?.id}</span></div>
        <div>Slug : <span className="font-mono">{tenant?.slug}</span></div>
        <div>Statut : {tenant?.status}</div>
        <div>Créé le : {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('fr-FR') : '—'}</div>
      </div>
    </div>
  );
};

export default ClientSettings;
