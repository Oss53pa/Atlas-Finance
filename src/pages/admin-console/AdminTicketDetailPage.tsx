// @ts-nocheck

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Send, Shield, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { updateTicketStatus } from '../../features/platform/services/adminService';
import { toast } from 'react-hot-toast';

const STATUS_FLOW = ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'];
const STATUS_LABELS: Record<string, string> = { open: 'Ouvert', in_progress: 'En cours', waiting_client: 'Attente client', resolved: 'Résolu', closed: 'Fermé' };
const STATUS_COLORS: Record<string, string> = { open: 'bg-red-100 text-red-700', in_progress: 'bg-blue-100 text-blue-700', waiting_client: 'bg-orange-100 text-orange-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' };
const PRIORITY_COLORS: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-gray-100 text-gray-500' };

const AdminTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const { data: ticket } = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: async () => {
      const { data } = await supabase.from('support_tickets').select('*, tenant:tenants(name)').eq('id', ticketId).single();
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: exchanges = [] } = useQuery({
    queryKey: ['ticket-exchanges', ticketId],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs')
        .select('*')
        .eq('resource_type', 'ticket')
        .eq('resource_id', ticketId)
        .order('created_at');
      return data || [];
    },
    enabled: !!ticketId,
  });

  const replyMut = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        tenant_id: ticket?.tenant_id,
        user_id: user?.id,
        action: 'TICKET_REPLY',
        resource_type: 'ticket',
        resource_id: ticketId,
        metadata: { message: reply, author: user?.email },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ticket-exchanges'] }); setReply(''); toast.success('Réponse envoyée'); },
  });

  const notesMut = useMutation({
    mutationFn: async () => {
      await supabase.from('support_tickets').update({ internal_notes: internalNote, updated_at: new Date().toISOString() }).eq('id', ticketId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ticket'] }); toast.success('Notes enregistrées'); },
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => updateTicketStatus(ticketId!, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ticket'] }); toast.success('Statut mis à jour'); },
  });

  if (!ticket) return <div className="text-center py-20 text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => navigate('/admin-console/support')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[#0f172a]">{ticket.subject}</h1>
            <p className="text-sm text-gray-500 mt-1">{ticket.tenant?.name} — {new Date(ticket.created_at).toLocaleString('fr-FR')}</p>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
          </div>
        </div>
        {ticket.description && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{ticket.description}</p>}

        {/* Status buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {STATUS_FLOW.map(s => (
            <button key={s} onClick={() => statusMut.mutate(s)} disabled={ticket.status === s}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${ticket.status === s ? 'bg-[#0f172a] text-white' : 'border hover:bg-gray-50 text-gray-600'}`}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Exchanges */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Échanges ({exchanges.length})
          </h3>
        </div>
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {exchanges.map((ex: any) => (
            <div key={ex.id} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#0f172a]">{(ex.metadata as Record<string, unknown>)?.author as string || 'Système'}</span>
                <span className="text-[10px] text-gray-400">{new Date(ex.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <p className="text-sm text-gray-700">{(ex.metadata as Record<string, unknown>)?.message as string || ex.action}</p>
            </div>
          ))}
          {exchanges.length === 0 && <div className="px-5 py-6 text-center text-gray-400 text-sm">Aucun échange</div>}
        </div>

        {/* Reply */}
        <div className="px-5 py-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Répondre..."
              rows={2} className="flex-1 border rounded-xl px-3 py-2 text-sm resize-none" />
            <button onClick={() => replyMut.mutate()} disabled={!reply.trim() || replyMut.isPending}
              className="px-4 bg-[#0f172a] text-white rounded-xl text-sm font-semibold disabled:opacity-50 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Internal notes */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Notes internes (non visibles par le client)
        </h3>
        <textarea value={internalNote || ticket.internal_notes || ''} onChange={e => setInternalNote(e.target.value)}
          placeholder="Notes pour l'équipe Atlas Studio..." rows={3} className="w-full border rounded-xl px-4 py-3 text-sm resize-none mb-3" />
        <button onClick={() => notesMut.mutate()} disabled={notesMut.isPending}
          className="px-4 py-2 bg-[#0f172a] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          Enregistrer
        </button>
      </div>
    </div>
  );
};

export default AdminTicketDetailPage;
