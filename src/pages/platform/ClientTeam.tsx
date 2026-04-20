
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mail, Clock, CheckCircle, Shield, Send, UserX, MoreVertical } from 'lucide-react';
import { getTeamMembers, getPendingInvitations, sendInvitation, suspendMember, updateMemberRole } from '../../features/platform/services/tenantService';
import { toast } from 'react-hot-toast';

const ROLES = [
  { code: 'superadmin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
  { code: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-700' },
  { code: 'comptable', label: 'Comptable', color: 'bg-blue-100 text-blue-700' },
  { code: 'controle_gestion', label: 'Contrôle de Gestion', color: 'bg-teal-100 text-teal-700' },
  { code: 'dg', label: 'Direction Générale', color: 'bg-amber-100 text-amber-700' },
  { code: 'auditeur', label: 'Auditeur', color: 'bg-green-100 text-green-700' },
  { code: 'readonly', label: 'Lecture seule', color: 'bg-gray-100 text-gray-600' },
  { code: 'collaborateur', label: 'Collaborateur', color: 'bg-gray-100 text-gray-600' },
];

const ClientTeam: React.FC = () => {
  const { tenant, isSuperAdmin, isAdmin } = useOutletContext<any>();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('comptable');

  const { data: members = [] } = useQuery({
    queryKey: ['team', tenant?.id],
    queryFn: () => getTeamMembers(tenant.id),
    enabled: !!tenant?.id,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', tenant?.id],
    queryFn: () => getPendingInvitations(tenant.id),
    enabled: !!tenant?.id,
  });

  const inviteMut = useMutation({
    mutationFn: () => sendInvitation(tenant.id, inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail(''); setShowInvite(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const seatsUsed = members.filter((m: any) => m.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-primary)]">Gestion de l'équipe</h1>
          <p className="text-sm text-gray-500 mt-1">{seatsUsed} membre(s) actif(s) · {invitations.length} invitation(s) en attente</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)}
            className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[#333] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Inviter
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-sm text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <Send className="w-4 h-4" /> Inviter un collaborateur
          </h3>
          <div className="flex gap-3 flex-wrap">
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@collaborateur.com" className="flex-1 min-w-[200px] border rounded-xl px-4 py-2.5 text-sm" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="border rounded-xl px-4 py-2.5 text-sm">
              {ROLES.filter(r => r.code !== 'superadmin').map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
            <button onClick={() => inviteMut.mutate()} disabled={!inviteEmail || inviteMut.isPending}
              className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              Envoyer
            </button>
            <button onClick={() => setShowInvite(false)} className="px-4 py-2.5 border rounded-xl text-sm hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Membre', 'Rôle', 'Statut', 'Dernière connexion', isAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                <th key={h} className="px-5 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m: any) => {
              const role = ROLES.find(r => r.code === m.role) || ROLES[ROLES.length - 1];
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
                        {(m.full_name || m.first_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-primary)]">{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`}</div>
                        <div className="text-xs text-gray-400">{m.phone || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${role.color}`}>{role.label}</span>
                  </td>
                  <td className="px-5 py-4">
                    {m.status === 'active' ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Actif</span>
                    ) : m.status === 'suspended' ? (
                      <span className="flex items-center gap-1 text-red-500 text-xs"><UserX className="w-3.5 h-3.5" /> Suspendu</span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-500 text-xs"><Clock className="w-3.5 h-3.5" /> Invité</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4">
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b">
            <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Invitations en attente ({invitations.length})
            </h3>
          </div>
          <div className="divide-y">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-[var(--color-primary)]">{inv.email}</div>
                    <div className="text-xs text-gray-400">Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {ROLES.find(r => r.code === inv.role)?.label || inv.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientTeam;
