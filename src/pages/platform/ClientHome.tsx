
import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator, FileText, FolderOpen, Users, UserPlus, CreditCard,
  Settings, ArrowRight, CheckCircle, Clock, AlertTriangle, Zap,
  BarChart3, TrendingUp
} from 'lucide-react';
import { getTeamMembers, getInvoices } from '../../features/platform/services/tenantService';

const ClientHome: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, subscriptions, userRole, isAdmin } = useOutletContext<any>();

  const { data: members = [] } = useQuery({
    queryKey: ['team', tenant?.id],
    queryFn: () => getTeamMembers(tenant.id),
    enabled: !!tenant?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', tenant?.id],
    queryFn: () => getInvoices(tenant.id),
    enabled: !!tenant?.id && isAdmin,
  });

  const activeSubs = subscriptions.filter((s: any) => s.status === 'active' || s.status === 'trialing');
  const trialSubs = subscriptions.filter((s: any) => s.status === 'trialing');
  const pendingInvoices = invoices.filter((i: any) => i.status === 'pending');

  const greeting = new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">{greeting}, {tenant?.userName?.split(' ')[0] || 'bienvenue'} !</h1>
        <p className="text-gray-500 mt-1">Voici un aperçu de votre espace {tenant?.name}</p>
      </div>

      {/* Alert trial */}
      {trialSubs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-orange-800 text-sm">Période d'essai en cours</p>
            <p className="text-orange-700 text-xs mt-1">
              {trialSubs.length} solution(s) en essai gratuit. Passez à un plan payant pour continuer après 14 jours.
            </p>
          </div>
          <button onClick={() => navigate('/client/billing')} className="ml-auto shrink-0 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700">
            Voir les plans
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Solutions actives', value: activeSubs.length, icon: Zap, color: 'var(--color-primary)' },
          { label: 'Membres', value: members.length, icon: Users, color: '#2563eb' },
          { label: 'Factures en attente', value: pendingInvoices.length, icon: CreditCard, color: pendingInvoices.length > 0 ? '#dc2626' : '#059669' },
          { label: 'Statut', value: tenant?.status === 'active' ? 'Actif' : tenant?.status === 'trial' ? 'Essai' : tenant?.status, icon: CheckCircle, color: '#059669' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <div className="text-2xl font-bold text-[var(--color-primary)]">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Solutions actives */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--color-primary)]">Vos solutions</h2>
          <button onClick={() => navigate('/solutions')} className="text-sm text-gray-500 hover:text-[var(--color-primary)] flex items-center gap-1">
            Catalogue <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {activeSubs.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">Aucune solution activée</p>
            <button onClick={() => navigate('/solutions')} className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold">
              Découvrir le catalogue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSubs.map((sub: any) => {
              const sol = sub.solution;
              if (!sol) return null;
              const ICONS: Record<string, any> = { 'atlas-fna': Calculator, 'liass-pilot': FileText, 'docjourney': FolderOpen };
              const Icon = ICONS[sol.code] || BarChart3;

              return (
                <div key={sub.id} className="bg-white rounded-xl border p-5 hover:shadow-lg transition-shadow group cursor-pointer"
                  onClick={() => {
                    window.open(`/client/app/${sol.code}`, '_blank');
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: sol.color + '12' }}>
                      <Icon className="w-5 h-5" style={{ color: sol.color }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--color-primary)]">{sol.name}</div>
                      <div className="text-xs text-gray-500">
                        {sub.status === 'trialing' ? 'Essai gratuit' : 'Actif'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-xs font-medium text-gray-400 group-hover:text-[var(--color-primary)] transition-colors">
                    Ouvrir <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raccourcis admin */}
      {isAdmin && (
        <div>
          <h2 className="text-lg font-bold text-[var(--color-primary)] mb-4">Administration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Gérer l\'équipe', desc: `${members.length} membres`, icon: UserPlus, path: '/client/team' },
              { label: 'Facturation', desc: `${pendingInvoices.length} en attente`, icon: CreditCard, path: '/client/billing' },
              { label: 'Paramètres', desc: 'Configuration', icon: Settings, path: '/client/settings' },
            ].map((item, i) => (
              <button key={i} onClick={() => navigate(item.path)}
                className="bg-white rounded-xl border p-5 text-left hover:shadow-md transition-shadow">
                <item.icon className="w-5 h-5 text-gray-400 mb-3" />
                <div className="font-semibold text-sm text-[var(--color-primary)]">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientHome;
