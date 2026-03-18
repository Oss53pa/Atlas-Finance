// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Headphones, AlertTriangle, Clock, CheckCircle, MessageCircle, Filter } from 'lucide-react';
import { getTicketsAdmin, updateTicketStatus } from '../../features/platform/services/adminService';
import { toast } from 'react-hot-toast';

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700', low: 'bg-gray-100 text-gray-500',
};
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-red-100 text-red-700', in_progress: 'bg-blue-100 text-blue-700',
  waiting_client: 'bg-orange-100 text-orange-700', resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const AdminSupportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets', filter],
    queryFn: () => getTicketsAdmin(filter),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTicketStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }); toast.success('Ticket mis à jour'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0f172a]">Support</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Tous</option>
          <option value="open">Ouverts</option>
          <option value="in_progress">En cours</option>
          <option value="waiting_client">Attente client</option>
          <option value="resolved">Résolus</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Sujet', 'Tenant', 'Priorité', 'Statut', 'Date', 'Actions'].map(h => (
              <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Aucun ticket</td></tr>
            ) : tickets.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="font-medium text-[#0f172a]">{t.subject}</div>
                  {t.description && <div className="text-xs text-gray-400 truncate max-w-[250px]">{t.description}</div>}
                </td>
                <td className="px-5 py-3 text-gray-600">{t.tenant?.name || '—'}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span></td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                <td className="px-5 py-3 text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-5 py-3">
                  <select value={t.status} onChange={e => updateMut.mutate({ id: t.id, status: e.target.value })}
                    className="text-xs border rounded px-2 py-1">
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="waiting_client">Attente client</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Fermé</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSupportPage;
