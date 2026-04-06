// @ts-nocheck

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building, Users, CreditCard, FileText, Activity,
  CheckCircle, XCircle, Clock, AlertTriangle, Shield, Play, Pause,
  Eye, UserCog
} from 'lucide-react';
import { getTenantDetail, suspendTenant, reactivateTenant, validatePayment } from '../../features/platform/services/adminService';
import { startImpersonation } from '../../features/platform/services/impersonationService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const TABS = [
  { key: 'general', label: 'Général', icon: Building },
  { key: 'subscriptions', label: 'Souscriptions', icon: CreditCard },
  { key: 'members', label: 'Utilisateurs', icon: Users },
  { key: 'invoices', label: 'Facturation', icon: FileText },
  { key: 'logs', label: 'Logs', icon: Activity },
  { key: 'notes', label: 'Notes', icon: FileText },
];

const AdminTenantDetailPage: React.FC = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('general');

  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: () => getTenantDetail(tenantId!),
    enabled: !!tenantId,
  });

  const suspendMut = useMutation({
    mutationFn: () => suspendTenant(tenantId!, 'Suspendu par admin'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tenant'] }); toast.success('Tenant suspendu'); },
  });

  const reactivateMut = useMutation({
    mutationFn: () => reactivateTenant(tenantId!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tenant'] }); toast.success('Tenant réactivé'); },
  });

  if (isLoading || !data) return <div className="text-center py-20 text-gray-400">Chargement...</div>;
  const { tenant, members, subscriptions, invoices, auditLogs } = data;
  if (!tenant) return <div className="text-center py-20 text-gray-400">Tenant non trouvé</div>;

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin-console/tenants')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0f172a]">{tenant.name}</h1>
            <p className="text-sm text-gray-500">{tenant.billing_email} · {tenant.country} · {tenant.currency}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            tenant.status === 'active' ? 'bg-green-100 text-green-700' :
            tenant.status === 'trial' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>{tenant.status}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            startImpersonation(tenantId!, tenant.name, user?.id || '', user?.email || user?.name || '');
            navigate('/client');
          }} className="px-3 py-2 bg-[#0f172a] text-white rounded-lg text-sm hover:bg-[#1e293b] flex items-center gap-1">
            <UserCog className="w-4 h-4" /> Se connecter en tant que
          </button>
          {tenant.status === 'active' || tenant.status === 'trial' ? (
            <button onClick={() => suspendMut.mutate()} className="px-3 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1">
              <Pause className="w-4 h-4" /> Suspendre
            </button>
          ) : (
            <button onClick={() => reactivateMut.mutate()} className="px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50 flex items-center gap-1">
              <Play className="w-4 h-4" /> Réactiver
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-[#0f172a] text-[#0f172a]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'general' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Raison sociale', value: tenant.name },
            { label: 'RCCM', value: tenant.rccm || '—' },
            { label: 'Pays', value: tenant.country },
            { label: 'Devise', value: tenant.currency },
            { label: 'Forme juridique', value: tenant.legal_form || '—' },
            { label: 'Email facturation', value: tenant.billing_email || '—' },
            { label: 'Slug', value: tenant.slug },
            { label: 'Créé le', value: new Date(tenant.created_at).toLocaleDateString('fr-FR') },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-400 mb-1">{f.label}</div>
              <div className="text-sm font-medium text-[#0f172a]">{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Solution', 'Statut', 'Paiement', 'Période', 'Prix/mois'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.map((s: any) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium">{s.solution?.name || s.solution_id}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{s.status}</span></td>
                  <td className="px-5 py-3 text-gray-500">{s.payment_method || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{s.current_period_start ? new Date(s.current_period_start).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-5 py-3 font-semibold">{fmt(s.solution?.price_monthly_xof)} FCFA</td>
                </tr>
              ))}
              {subscriptions.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Aucune souscription</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'members' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Membre', 'Rôle', 'Statut', 'Dernière connexion'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m: any) => (
                <tr key={m.id}>
                  <td className="px-5 py-3"><div className="font-medium">{m.full_name || `${m.first_name} ${m.last_name}`}</div><div className="text-xs text-gray-400">{m.phone}</div></td>
                  <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{m.role}</span></td>
                  <td className="px-5 py-3">{m.status === 'active' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{m.last_login_at ? new Date(m.last_login_at).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Facture', 'Montant', 'Statut', 'Méthode', 'Date', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3 font-mono text-xs">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 font-semibold">{fmt(inv.amount)} {inv.currency}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{inv.payment_method || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3">
                    {inv.status === 'pending' && (
                      <button onClick={async () => {
                        const ref = prompt('Référence de paiement :');
                        if (ref) { await validatePayment(inv.id, ref); queryClient.invalidateQueries({ queryKey: ['admin-tenant'] }); toast.success('Paiement validé'); }
                      }} className="text-xs text-green-700 hover:underline font-medium">Valider</button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Aucune facture</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>{['Action', 'Ressource', 'Date', 'Détails'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-xs">{log.action}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{log.resource_type || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono truncate max-w-[200px]">{log.metadata ? JSON.stringify(log.metadata) : '—'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Aucun log</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <NotesTab tenantId={tenantId!} />
      )}
    </div>
  );
};

// Notes internes (non visibles par le client)
const NotesTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [note, setNote] = React.useState('');
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['tenant-notes', tenantId],
    queryFn: async () => {
      const { data } = await import('../../lib/supabase').then(m => m.supabase)
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('action', 'INTERNAL_NOTE')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        tenant_id: tenantId,
        user_id: user?.id,
        action: 'INTERNAL_NOTE',
        metadata: { note, author: user?.email },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-notes'] });
      setNote('');
      toast.success('Note enregistrée');
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-sm text-[#0f172a] mb-3">Ajouter une note interne</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Notes internes sur ce tenant (non visibles par le client)..."
          rows={3} className="w-full border rounded-xl px-4 py-3 text-sm resize-none mb-3" />
        <button onClick={() => saveMut.mutate()} disabled={!note.trim() || saveMut.isPending}
          className="px-4 py-2 bg-[#0f172a] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          Enregistrer
        </button>
      </div>
      {notes.length > 0 && (
        <div className="bg-white rounded-xl border divide-y">
          {notes.map((n: any) => (
            <div key={n.id} className="p-4">
              <div className="text-sm text-[#0f172a]">{(n.metadata as Record<string, unknown>)?.note as string}</div>
              <div className="text-xs text-gray-400 mt-2">
                {(n.metadata as Record<string, unknown>)?.author as string || 'Admin'} — {new Date(n.created_at).toLocaleString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTenantDetailPage;
