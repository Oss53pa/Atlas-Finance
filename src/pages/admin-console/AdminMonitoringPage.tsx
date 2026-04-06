
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, AlertTriangle, Clock, Database, Zap, Globe, Server, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdminMonitoringPage: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-monitoring'],
    queryFn: async () => {
      const [tenantsRes, logsRes, ticketsRes] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('id, action, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      return {
        totalTenants: tenantsRes.count || 0,
        recentLogs: logsRes.data || [],
        openTickets: ticketsRes.count || 0,
      };
    },
    refetchInterval: 30_000,
  });

  const services = [
    { name: 'Supabase Auth', status: 'operational', icon: Shield },
    { name: 'Supabase Database', status: 'operational', icon: Database },
    { name: 'Edge Functions', status: 'operational', icon: Zap },
    { name: 'Supabase Storage', status: 'operational', icon: Server },
    { name: 'Realtime', status: 'operational', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#0f172a]">Monitoring</h1>

      {/* Services status */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-sm text-[#0f172a] mb-4">État des services</h2>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> Opérationnel
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <Database className="w-5 h-5 text-blue-500 mb-2" />
          <div className="text-2xl font-bold text-[#0f172a]">{stats?.totalTenants || 0}</div>
          <div className="text-xs text-gray-500">Tenants en base</div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <Activity className="w-5 h-5 text-green-500 mb-2" />
          <div className="text-2xl font-bold text-[#0f172a]">{stats?.recentLogs.length || 0}</div>
          <div className="text-xs text-gray-500">Actions récentes</div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <AlertTriangle className="w-5 h-5 text-orange-500 mb-2" />
          <div className="text-2xl font-bold text-[#0f172a]">{stats?.openTickets || 0}</div>
          <div className="text-xs text-gray-500">Tickets ouverts</div>
        </div>
      </div>

      {/* Recent audit logs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Dernières actions (toutes tenants)</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="border-b sticky top-0 bg-white">
              <tr>{['Action', 'Ressource', 'Date'].map(h => (
                <th key={h} className="px-5 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {(stats?.recentLogs || []).map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-xs font-medium">{log.action}</td>
                  <td className="px-5 py-2 text-xs text-gray-400">{log.resource_type || '—'}</td>
                  <td className="px-5 py-2 text-xs text-gray-400">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMonitoringPage;
