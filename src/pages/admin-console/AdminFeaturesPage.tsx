// @ts-nocheck

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ToggleLeft, Search, CheckCircle, XCircle, Building, Zap, Sun, Moon, Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toggleModule } from '../../features/platform/services/featureFlagService';
import { toast } from 'react-hot-toast';
import { getLandingTheme, setLandingTheme, type LandingThemeMode } from '../../config/landingTheme';

const MODULES = [
  { code: 'atlas-fna', label: 'Atlas F&A', color: '#171717' },
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

      {/* Landing page theme config */}
      <LandingThemeConfig />

      {/* Flags globaux par plan */}
      <GlobalPlanFlags modules={MODULES} tenants={tenants} queryClient={queryClient} />

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

// ════════════════════════════════════════════════════════
// Flags globaux par plan (starter / pro / enterprise)
// ════════════════════════════════════════════════════════
const PLANS = ['starter', 'pro', 'enterprise'];

const GlobalPlanFlags: React.FC<{ modules: typeof MODULES; tenants: any[]; queryClient: any }> = ({ modules, tenants, queryClient }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleTogglePlan = async (plan: string, moduleCode: string, enable: boolean) => {
    setLoading(`${plan}-${moduleCode}`);
    try {
      const planTenants = tenants.filter(t => t.status === plan || (plan === 'pro' && t.status === 'active'));
      for (const t of planTenants) {
        await toggleModule(t.id, moduleCode, enable);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      toast.success(`${moduleCode} ${enable ? 'activé' : 'désactivé'} pour ${planTenants.length} tenant(s) ${plan}`);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    } finally { setLoading(null); }
  };

  // Compute: is a module enabled for majority of tenants in a plan?
  const isPlanEnabled = (plan: string, moduleCode: string) => {
    const planTenants = tenants.filter(t => t.status === plan || (plan === 'pro' && t.status === 'active'));
    if (planTenants.length === 0) return false;
    const enabledCount = planTenants.filter(t => t.flags?.some((f: any) => f.module === moduleCode && f.enabled)).length;
    return enabledCount > planTenants.length / 2;
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-sm text-[#0f172a] mb-4">Flags globaux par plan</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              {modules.map(m => (
                <th key={m.code} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {PLANS.map(plan => (
              <tr key={plan}>
                <td className="px-4 py-3 font-medium text-[#0f172a] capitalize">{plan}</td>
                {modules.map(m => {
                  const enabled = isPlanEnabled(plan, m.code);
                  const isLoading = loading === `${plan}-${m.code}`;
                  return (
                    <td key={m.code} className="px-3 py-3 text-center">
                      <button
                        disabled={isLoading}
                        onClick={() => handleTogglePlan(plan, m.code, !enabled)}
                        className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                          enabled ? 'bg-blue-500' : 'bg-gray-200'
                        } ${isLoading ? 'opacity-50' : ''}`}
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
      <p className="text-[10px] text-gray-400 mt-2">Les toggles bleus sont globaux (tous les tenants du plan). Les toggles verts ci-dessous sont par tenant.</p>
    </div>
  );
};

// ════════════════════════════════════════════════════════
// Landing Page Theme — Mode jour / nuit
// ════════════════════════════════════════════════════════
const LandingThemeConfig: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<LandingThemeMode>(getLandingTheme());

  const apply = (mode: LandingThemeMode) => {
    setLandingTheme(mode);
    setCurrentMode(mode);
    toast.success(`Landing page : mode ${mode === 'dark' ? 'nuit' : 'jour'} activé`);
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-[#0f172a]">Landing Page — Thème</h3>
          <p className="text-xs text-gray-500 mt-0.5">Mode d'affichage de la page d'accueil Atlas F&A</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => apply('dark')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentMode === 'dark'
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Moon className="w-3.5 h-3.5" /> Nuit
          </button>
          <button
            onClick={() => apply('light')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentMode === 'light'
                ? 'bg-white text-[#0f172a] shadow-sm border'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Jour
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className={`rounded-lg overflow-hidden border ${currentMode === 'dark' ? 'bg-[#0d0d0d]' : 'bg-white'} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-6 h-6 rounded ${currentMode === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`} />
          <div className={`h-2 w-20 rounded ${currentMode === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`} />
          <div className="flex-1" />
          <div className={`h-2 w-12 rounded ${currentMode === 'dark' ? 'bg-[#c9a96e]/40' : 'bg-[#9a7d3e]/30'}`} />
        </div>
        <div className="text-center py-3">
          <div className={`h-3 w-48 rounded mx-auto mb-2 ${currentMode === 'dark' ? 'bg-white/30' : 'bg-gray-300'}`} />
          <div className={`h-2 w-32 rounded mx-auto ${currentMode === 'dark' ? 'bg-[#c9a96e]/30' : 'bg-[#9a7d3e]/20'}`} />
        </div>
        <div className="flex justify-center gap-2 mt-2">
          <div className={`h-6 w-20 rounded ${currentMode === 'dark' ? 'bg-[#c9a96e]' : 'bg-[#9a7d3e]'}`} />
          <div className={`h-6 w-16 rounded border ${currentMode === 'dark' ? 'border-white/10' : 'border-gray-200'}`} />
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Les visiteurs peuvent aussi basculer via l'icône dans la navbar. Ce réglage définit le mode par défaut.</p>
    </div>
  );
};

export default AdminFeaturesPage;
