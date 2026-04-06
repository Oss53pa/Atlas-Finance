
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, Users, CreditCard, AlertTriangle, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, BarChart3, Zap
} from 'lucide-react';
import { getAdminKPIs } from '../../features/platform/services/adminService';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useQuery({ queryKey: ['admin-kpis'], queryFn: getAdminKPIs, refetchInterval: 60_000 });

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  if (isLoading || !kpis) {
    return <div className="flex items-center justify-center min-h-[400px] text-gray-400">Chargement des KPIs...</div>;
  }

  const growthPct = kpis.newLastMonth > 0 ? Math.round(((kpis.newThisMonth - kpis.newLastMonth) / kpis.newLastMonth) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#0f172a]">Dashboard Admin</h1>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: `${fmt(kpis.mrr)} FCFA`, icon: DollarSign, color: '#059669', sub: `${kpis.activeSubscriptions} abonnements` },
          { label: 'Tenants actifs', value: fmt(kpis.activeTenants), icon: Users, color: '#2563eb', sub: `${kpis.trialTenants} en essai` },
          { label: 'Nouveaux ce mois', value: fmt(kpis.newThisMonth), icon: TrendingUp, color: '#7c3aed', sub: growthPct >= 0 ? `+${growthPct}% vs M-1` : `${growthPct}% vs M-1` },
          { label: 'Paiements en attente', value: fmt(kpis.pendingPayments), icon: Clock, color: kpis.pendingPayments > 0 ? '#dc2626' : '#059669', sub: `${fmt(kpis.pendingAmount)} FCFA` },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              {i === 2 && (
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${growthPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growthPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(growthPct)}%
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-[#0f172a]">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Répartition tenants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-sm text-[#0f172a] mb-4">Répartition des tenants</h3>
          <div className="space-y-3">
            {[
              { label: 'Actifs', count: kpis.activeTenants, color: 'bg-green-500', pct: Math.round((kpis.activeTenants / Math.max(kpis.totalTenants, 1)) * 100) },
              { label: 'En essai', count: kpis.trialTenants, color: 'bg-orange-500', pct: Math.round((kpis.trialTenants / Math.max(kpis.totalTenants, 1)) * 100) },
              { label: 'Suspendus', count: kpis.suspendedTenants, color: 'bg-red-500', pct: Math.round((kpis.suspendedTenants / Math.max(kpis.totalTenants, 1)) * 100) },
              { label: 'Churned', count: kpis.churnedTenants, color: 'bg-gray-400', pct: Math.round((kpis.churnedTenants / Math.max(kpis.totalTenants, 1)) * 100) },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-600">{item.label}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
                <div className="w-12 text-right text-xs font-semibold text-[#0f172a]">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-sm text-[#0f172a] mb-4">Revenus</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-800">Revenus totaux</div>
              <div className="font-bold text-green-700">{fmt(kpis.totalRevenue)} FCFA</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">MRR actuel</div>
              <div className="font-bold text-blue-700">{fmt(kpis.mrr)} FCFA</div>
            </div>
            {kpis.pendingPayments > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Paiements en attente
                </div>
                <div className="font-bold text-red-700">{fmt(kpis.pendingAmount)} FCFA</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Gérer les tenants', desc: `${kpis.totalTenants} organisations`, icon: Users, path: '/admin-console/tenants' },
          { label: 'Valider les paiements', desc: `${kpis.pendingPayments} en attente`, icon: CreditCard, path: '/admin-console/billing' },
          { label: 'Feature Flags', desc: 'Activer / désactiver modules', icon: Zap, path: '/admin-console/features' },
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)}
            className="bg-white rounded-xl border p-5 text-left hover:shadow-md transition-shadow group">
            <item.icon className="w-5 h-5 text-gray-400 mb-3" />
            <div className="font-semibold text-sm text-[#0f172a]">{item.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
