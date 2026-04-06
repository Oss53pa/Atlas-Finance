
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Key, Users, CheckCircle, XCircle, Plus, Minus, ChevronDown,
  Calculator, FileText, FolderOpen, Shield, ArrowRight
} from 'lucide-react';
import { getTeamMembers } from '../../features/platform/services/tenantService';
import { toast } from 'react-hot-toast';

const SOL_ICONS: Record<string, any> = { 'atlas-fna': Calculator, 'liass-pilot': FileText, 'docjourney': FolderOpen };

const isDev = import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.VITE_DATA_MODE === 'local';

// Démo : quel membre a accès à quelle solution
const DEMO_ACCESS: Record<string, string[]> = {
  'u1': ['atlas-fna', 'liass-pilot'],  // Amadou — tout
  'u2': ['atlas-fna'],                  // Fatou — Atlas F&A
  'u3': ['atlas-fna'],                  // Ibrahim — Atlas F&A
  'u4': [],                                  // Marie — rien encore
};

const ClientLicenses: React.FC = () => {
  const { tenant, subscriptions, isAdmin } = useOutletContext<any>();
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>(DEMO_ACCESS);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['team', tenant?.id],
    queryFn: () => getTeamMembers(tenant?.id),
    enabled: !!tenant?.id,
  });

  const activeSubs = subscriptions.filter((s: any) => s.status === 'active' || s.status === 'trialing');

  const toggleAccess = (memberId: string, solCode: string) => {
    setAccessMap(prev => {
      const current = prev[memberId] || [];
      const updated = current.includes(solCode)
        ? current.filter(c => c !== solCode)
        : [...current, solCode];
      return { ...prev, [memberId]: updated };
    });
    toast.success('Accès mis à jour');
  };

  const getMemberAccess = (memberId: string) => accessMap[memberId] || [];
  const getSeatsUsed = (solCode: string) => Object.values(accessMap).filter(codes => codes.includes(solCode)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#171717]">Licences & Accès</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez les accès de votre équipe aux solutions souscrites</p>
      </div>

      {/* Vue d'ensemble des licences */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeSubs.map((sub: any) => {
          const sol = sub.solution;
          if (!sol) return null;
          const Icon = SOL_ICONS[sol.code] || Shield;
          const used = getSeatsUsed(sol.code);
          const total = sub.seats_limit || 5;
          const pct = Math.round((used / total) * 100);

          return (
            <div key={sub.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: sol.color + '12' }}>
                  <Icon className="w-5 h-5" style={{ color: sol.color }} />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#171717]">{sol.name}</div>
                  <div className="text-xs text-gray-500">
                    {sub.status === 'trialing' ? 'Essai gratuit' : 'Actif'}
                  </div>
                </div>
              </div>

              {/* Barre de progression sièges */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Sièges utilisés</span>
                  <span className="font-semibold text-[#171717]">{used} / {total}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: pct > 80 ? '#dc2626' : sol.color }}
                  />
                </div>
              </div>

              <button
                onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                className="w-full text-xs text-gray-500 hover:text-[#171717] flex items-center justify-center gap-1 pt-2 border-t"
              >
                Gérer les accès <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedSub === sub.id ? 'rotate-180' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Panel de distribution des accès */}
      {expandedSub && (() => {
        const sub = activeSubs.find((s: any) => s.id === expandedSub);
        if (!sub?.solution) return null;
        const sol = sub.solution;
        const Icon = SOL_ICONS[sol.code] || Shield;
        const total = sub.seats_limit || 5;
        const used = getSeatsUsed(sol.code);

        return (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" style={{ color: sol.color }} />
                <div>
                  <h3 className="font-bold text-sm text-[#171717]">Distribution — {sol.name}</h3>
                  <p className="text-xs text-gray-500">{used} / {total} sièges attribués</p>
                </div>
              </div>
              {used >= total && (
                <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-medium">Limite atteinte</span>
              )}
            </div>

            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Accès</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m: any) => {
                  const hasAccess = getMemberAccess(m.id).includes(sol.code);
                  const canAdd = used < total || hasAccess;

                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center text-white text-xs font-bold">
                            {(m.full_name || m.first_name || 'U')[0]}
                          </div>
                          <div>
                            <div className="font-medium text-[#171717]">{m.full_name || `${m.first_name} ${m.last_name}`}</div>
                            <div className="text-xs text-gray-400">{m.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{m.role}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isAdmin ? (
                          <button
                            onClick={() => {
                              if (!hasAccess && !canAdd) { toast.error('Limite de sièges atteinte'); return; }
                              toggleAccess(m.id, sol.code);
                            }}
                            className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                              hasAccess ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${hasAccess ? 'translate-x-2' : '-translate-x-2'}`} />
                          </button>
                        ) : (
                          hasAccess ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Récap par membre */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-bold text-sm text-[#171717]">Récapitulatif par membre</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solutions accessibles</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m: any) => {
              const access = getMemberAccess(m.id);
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[#171717]">{m.full_name || m.first_name}</div>
                    <div className="text-xs text-gray-400">{m.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    {access.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {access.map(code => {
                          const sub = activeSubs.find((s: any) => s.solution?.code === code);
                          const sol = sub?.solution;
                          if (!sol) return null;
                          return (
                            <span key={code} className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: sol.color + '15', color: sol.color }}>
                              {sol.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Aucun accès</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-[#171717]">{access.length}</span>
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

export default ClientLicenses;
