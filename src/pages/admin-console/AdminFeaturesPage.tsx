// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ToggleLeft, Search, CheckCircle, XCircle, Building, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toggleModule } from '../../features/platform/services/featureFlagService';
import { toast } from 'react-hot-toast';

const MODULES = [
  { code: 'atlas-finance', label: 'Atlas Finance', color: '#171717' },
  { code: 'liass-pilot', label: "Liass'Pilot", color: '#0891b2' },
  { code: 'docjourney', label: 'DocJourney', color: '#7c3aed' },
  { code: 'tms-pro', label: 'TMS Pro Africa', color: '#dc2626' },
  { code: 'scrutix', label: 'Scrutix', color: '#059669' },
  { code: 'atlas-hr', label: 'Atlas HR', color: '#2563eb' },
];

const AdminFeaturesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Charger tous les tenants avec leurs flags
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin-features', search],
    queryFn: async () => {
      const { data: allTenants } = await supabase.from('tenants').select('id, name, status').order('name');
      const { data: allFlags } = await supabase.from('feature_flags').select('*');

      let result = (allTenants || []).map(t => ({
        ...t,
        flags: (allFlags || []).filter(f => f.tenant_id === t.id),
      }));

      if (search) {
        result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
      }
      return result;
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ tenantId, module, enabled }: { tenantId: string; module: string; enabled: boolean }) =>
      toggleModule(tenantId, module, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success('Feature flag mis à jour');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isEnabled = (tenant: any, moduleCode: string) => {
    return tenant.flags?.some((f: any) => f.module === moduleCode && f.enabled);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Feature Flags</h1>
          <p className="text-sm text-gray-500">Activer/désactiver des modules par tenant</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un tenant..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-[200px]">Tenant</th>
              {MODULES.map(m => (
                <th key={m.code} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[120px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={MODULES.length + 1} className="px-5 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={MODULES.length + 1} className="px-5 py-8 text-center text-gray-400">Aucun tenant</td></tr>
            ) : tenants.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 sticky left-0 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-[#0f172a]">{t.name}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      t.status === 'active' ? 'bg-green-100 text-green-700' :
                      t.status === 'trial' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{t.status}</span>
                  </div>
                </td>
                {MODULES.map(m => {
                  const enabled = isEnabled(t, m.code);
                  return (
                    <td key={m.code} className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleMut.mutate({ tenantId: t.id, module: m.code, enabled: !enabled })}
                        className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                          enabled ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-2' : '-translate-x-2'}`} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFeaturesPage;
