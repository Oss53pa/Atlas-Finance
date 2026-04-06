
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Mail, Plus, Clock, CheckCircle, Shield, ArrowLeft, Send } from 'lucide-react';
import { getTeamMembers, getPendingInvitations, sendInvitation } from '../../features/onboarding/services/onboardingService';
import { toast } from 'react-hot-toast';

const ROLES = [
  { code: 'admin', label: 'Administrateur', desc: 'Accès complet' },
  { code: 'manager', label: 'Manager', desc: 'Gestion et supervision' },
  { code: 'accountant', label: 'Comptable', desc: 'Saisie et comptabilité' },
  { code: 'user', label: 'Utilisateur', desc: 'Lecture seule' },
];

const TeamSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('accountant');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: members = [] } = useQuery({ queryKey: ['team-members'], queryFn: getTeamMembers });
  const { data: invitations = [] } = useQuery({ queryKey: ['pending-invitations'], queryFn: getPendingInvitations });

  const inviteMutation = useMutation({
    mutationFn: () => sendInvitation(inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/client')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-[#171717]">Gestion de l'équipe</h1>
              <p className="text-xs text-gray-500">{members.length} membre(s) · {invitations.length} invitation(s) en attente</p>
            </div>
          </div>
          <button onClick={() => setShowInviteForm(true)}
            className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#333] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Inviter
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Invite form */}
        {showInviteForm && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-bold text-[#171717] mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" /> Inviter un collaborateur
            </h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <input type="email" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@collaborateur.com"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="border rounded-lg px-3 py-2.5 text-sm">
                {ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
              <button onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="px-5 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#333] disabled:opacity-50">
                Envoyer
              </button>
              <button onClick={() => setShowInviteForm(false)}
                className="px-3 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Membres ({members.length})
            </h2>
          </div>
          <div className="divide-y">
            {members.map(m => (
              <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#171717] flex items-center justify-center text-white text-sm font-bold">
                    {(m.full_name || m.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[#171717]">{m.full_name || m.email}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full font-medium text-gray-600">
                    {ROLES.find(r => r.code === m.role_code)?.label || m.role_code}
                  </span>
                  {m.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-red-500">Inactif</span>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">Aucun membre</div>
            )}
          </div>
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b bg-orange-50">
              <h2 className="font-semibold text-sm text-orange-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Invitations en attente ({invitations.length})
              </h2>
            </div>
            <div className="divide-y">
              {invitations.map(inv => (
                <div key={inv.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{inv.email}</div>
                      <div className="text-xs text-gray-500">
                        Envoyée le {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                        {' — Expire le '}{new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-orange-100 rounded-full font-medium text-orange-700">
                    {ROLES.find(r => r.code === inv.role_code)?.label || inv.role_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamSettingsPage;
