import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Edit2, UserX, Shield, Eye, Key, Clock,
  LogOut, Globe, Monitor, X, Search, ChevronDown, Filter, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../../contexts/DataContext';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

// `nom` reste l'identifiant technique (clé de defaultPermissions/roleBadgeColor + comparaison u.role) ;
// nomKey/descKey/permKeys ne servent qu'à l'affichage traduit.
const roles = [
  { nom: 'Administrateur', nomKey: 'adminUsers.roleAdmin', descKey: 'adminUsers.roleAdminDesc', permKeys: ['adminUsers.permReadAll', 'adminUsers.permWriteAll', 'adminUsers.permDelete', 'adminUsers.permAdminister', 'adminUsers.permManageUsers'] },
  { nom: 'Manager', nomKey: 'adminUsers.roleManager', descKey: 'adminUsers.roleManagerDesc', permKeys: ['adminUsers.permReadAll', 'adminUsers.permWriteEntries', 'adminUsers.permValidate', 'adminUsers.permReports', 'adminUsers.permExport'] },
  { nom: 'Comptable', nomKey: 'adminUsers.roleAccountant', descKey: 'adminUsers.roleAccountantDesc', permKeys: ['adminUsers.permReadEntries', 'adminUsers.permWriteEntries', 'adminUsers.permReports', 'adminUsers.permJournals'] },
  { nom: 'Lecteur', nomKey: 'adminUsers.roleReader', descKey: 'adminUsers.roleReaderDesc', permKeys: ['adminUsers.permReadEntries', 'adminUsers.permReadReports', 'adminUsers.permReadThirdParties'] },
];

// Clés d'affichage des modules (l'ordre pilote defaultPermissions/permMatrix).
const modules = ['adminUsers.modEntries', 'adminUsers.modJournals', 'adminUsers.modChartOfAccounts', 'adminUsers.modThirdParties', 'adminUsers.modReports', 'adminUsers.modTreasury', 'adminUsers.modFixedAssets', 'adminUsers.modAdministration'];

const defaultPermissions: Record<string, boolean[][]> = {
  Administrateur: modules.map(() => [true, true, true, true]),
  Manager: modules.map((_, i) => [true, true, i < 5, i === 7 ? false : false]),
  Comptable: modules.map((_, i) => [true, i < 4, false, false]),
  Lecteur: modules.map(() => [true, false, false, false]),
};

const roleBadgeColor: Record<string, string> = {
  Administrateur: 'bg-red-100 text-red-700',
  Manager: 'bg-blue-100 text-blue-700',
  Comptable: 'bg-green-100 text-green-700',
  Lecteur: 'bg-gray-100 text-gray-700',
};

const AdminUsersTabBar = ({ tabs, active, onSelect }: { tabs: string[]; active: number; onSelect: (i: number) => void }) => (
  <div className="border-b border-gray-200 mb-6 overflow-x-auto">
    <nav className="flex space-x-1 -mb-px">
      {tabs.map((tab, i) => (
        <button key={i} onClick={() => onSelect(i)}
          className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === i ? 'border-[#C0322B] text-[#C0322B]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}>
          {tab}
        </button>
      ))}
    </nav>
  </div>
);

const AdminUsers: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', role: 'Comptable',
    telephone: '', departement: 'Comptabilite', status: 'Actif',
  });
  const [selectedRole, setSelectedRole] = useState('Administrateur');
  const [permMatrix, setPermMatrix] = useState(defaultPermissions['Administrateur']);

  const tabs = [t('adminUsers.tabUsersList'), t('adminUsers.tabRoles'), t('adminUsers.tabPermissions'), t('adminUsers.tabActiveSessions'), t('adminUsers.tabLoginHistory')];

  const saveSetting = async (key: string, value: any) => {
    const data = { key, value: JSON.stringify(value), updatedAt: new Date().toISOString() };
    try {
      const existing = await adapter.getById('settings', key);
      if (existing) {
        await adapter.update('settings', key, data);
      } else {
        await adapter.create('settings', data);
      }
    } catch (err) { /* silent */
      try { await adapter.create('settings', data); } catch (err) { /* silent */}
    }
  };

  // Charge les membres depuis Supabase (company_members), avec fallback localStorage
  const loadUsers = async () => {
    try {
      const { data: members, error } = await supabase
        .from('company_members')
        .select('*')
        .order('invited_at', { ascending: false });

      if (!error && members) {
        const mapped = members.map((m: any) => ({
          id: m.id,
          prenom: m.first_name ?? '',
          nom: m.last_name ?? '',
          email: m.email,
          telephone: m.telephone ?? '',
          departement: m.departement ?? '',
          role: m.role,
          status: m.active ? 'Actif' : 'Inactif',
          derniereConnexion: m.last_login_at
            ? new Date(m.last_login_at).toLocaleString('fr-FR')
            : '-',
        }));
        setUsers(mapped);
        return;
      }
    } catch (_) { /* Supabase non configuré → fallback */ }

    // Fallback : localStorage via DataAdapter
    try {
      const allSettings = await adapter.getAll<any>('settings');
      const usersSetting = allSettings.find((s: any) => s.key === 'admin_users');
      if (usersSetting?.value) setUsers(JSON.parse(usersSetting.value));
    } catch (_) { /* ignoré */ }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadUsers();

        // Historique connexions (audit local)
        const auditLogs = await adapter.getAll<any>('auditLogs');
        const connectionLogs = auditLogs
          .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 50)
          .map((l: any) => ({
            id: l.id,
            date: new Date(l.timestamp).toLocaleString('fr-FR'),
            utilisateur: l.userId || t('adminUsers.system'),
            evenement: l.action || t('adminUsers.eventFallback'),
            ip: '-', navigateur: '-', localisation: '-',
            details: l.details || '',
          }));
        setHistorique(connectionLogs);
      } catch (_) {
        /* ignoré */
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  const openCreateModal = () => {
    setForm({ prenom: '', nom: '', email: '', role: 'Comptable', telephone: '', departement: 'Comptabilite', status: 'Actif' });
    setEditingUser(null);
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setForm({ prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, telephone: user.telephone, departement: user.departement, status: user.status });
    setEditingUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.role) {
      toast.error(t('adminUsers.errFillRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error(t('adminUsers.errInvalidEmail'));
      return;
    }
    try {
      if (modalMode === 'create') {
        // ── Invitation via edge function (Supabase Auth + email HTML) ─────────
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error(t('adminUsers.errSessionExpired'));
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prenom: form.prenom,
            nom: form.nom,
            email: form.email,
            role: form.role,
            telephone: form.telephone,
            departement: form.departement,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          toast.error(result.error || t('adminUsers.errCreateAccount'));
          return;
        }

        const emailMsg = result.emailSent
          ? t('adminUsers.invitationLinkSent', { email: form.email })
          : t('adminUsers.invitationCreatedNoEmail');
        toast.success(`✅ ${t('adminUsers.userAdded', { name: `${form.prenom} ${form.nom}`, msg: emailMsg })}`);

        // Recharger depuis company_members (l'edge function y a upsert)
        await loadUsers();
        setShowModal(false);
        return;

      } else {
        // Mise à jour dans company_members (Supabase)
        const { error: updateErr } = await (supabase as any)
          .from('company_members')
          .update({
            first_name: form.prenom,
            last_name: form.nom,
            role: form.role,
            telephone: form.telephone,
            departement: form.departement,
            active: form.status === 'Actif',
          })
          .eq('email', editingUser?.email);

        if (updateErr) {
          // Fallback local si Supabase non configuré
          const fallback = users.map((u: any) => u.id === editingUser?.id
            ? { ...u, prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone, departement: form.departement, role: form.role, status: form.status }
            : u
          );
          setUsers(fallback);
          await saveSetting('admin_users', fallback);
        } else {
          await loadUsers();
        }
        toast.success(t('adminUsers.userUpdated', { name: `${form.prenom} ${form.nom}` }));
        setShowModal(false);
        return;
      }
    } catch (err) {
      toast.error(t('adminUsers.errSave'));
    }
  };

  const toggleUserStatus = async (u: any) => {
    const newActive = u.status !== 'Actif';
    // Mise à jour optimiste locale
    setUsers(prev => prev.map((u2: any) => u2.id === u.id
      ? { ...u2, status: newActive ? 'Actif' : 'Inactif' }
      : u2
    ));
    // Persistance Supabase
    const { error } = await (supabase as any)
      .from('company_members')
      .update({ active: newActive })
      .eq('email', u.email);
    if (error) {
      // Fallback local
      const fallback = users.map((u2: any) => u2.id === u.id
        ? { ...u2, status: newActive ? 'Actif' : 'Inactif' }
        : u2
      );
      await saveSetting('admin_users', fallback);
    }
    toast.success(newActive
      ? t('adminUsers.userReactivated', { name: `${u.prenom} ${u.nom}` })
      : t('adminUsers.userDeactivated', { name: `${u.prenom} ${u.nom}` }));
  };

  const handleResendInvitation = async (u: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t('adminUsers.errSessionExpired'));
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const loadingToast = toast.loading(t('adminUsers.resendingInvitation', { email: u.email }));

      const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prenom: u.prenom,
          nom: u.nom,
          email: u.email,
          role: u.role,
          telephone: u.telephone,
          departement: u.departement,
          forceRecovery: true,
        }),
      });

      toast.dismiss(loadingToast);
      const result = await res.json();

      if (!res.ok || !result.success) {
        // Clipboard fallback si le lien est disponible mais email KO
        if (result.magicLink) {
          const confirmed = window.confirm(
            t('adminUsers.emailNotSentConfirm', { error: result.error || t('adminUsers.unknownError') })
          );
          if (confirmed) {
            await navigator.clipboard.writeText(result.magicLink);
            toast.success(t('adminUsers.linkCopied'));
          }
        } else {
          toast.error(result.error || t('adminUsers.errResend'));
        }
        return;
      }

      toast.success(`✅ ${t('adminUsers.invitationResent', { email: u.email })}`);
      await loadUsers(); // rafraîchir la liste (invited_at mis à jour)
    } catch (err) {
      toast.error(t('adminUsers.errResend'));
    }
  };

  const savePermissions = async () => {
    try {
      const allSettings = await adapter.getAll<any>('settings');
      const permSetting = allSettings.find((s: any) => s.key === 'admin_permissions');
      const existing = permSetting?.value ? JSON.parse(permSetting.value) : {};
      existing[selectedRole] = permMatrix;
      await saveSetting('admin_permissions', existing);
      toast.success(t('adminUsers.permsSaved', { role: selectedRole }));
    } catch (err) { /* silent */ toast.error(t('adminUsers.errGeneric')); }
  };

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const togglePerm = (row: number, col: number) => {
    setPermMatrix(prev => prev.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? !c : c) : r));
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-bold">{modalMode === 'create' ? t('adminUsers.modalCreateTitle') : t('adminUsers.modalEditTitle')}</h3>
            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-prenom" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldFirstName')} <span className="text-red-500">*</span></label>
                <input id="user-prenom" type="text" value={form.prenom} onChange={e => updateField('prenom', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent" required />
              </div>
              <div>
                <label htmlFor="user-nom" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldLastName')} <span className="text-red-500">*</span></label>
                <input id="user-nom" type="text" value={form.nom} onChange={e => updateField('nom', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldEmail')} <span className="text-red-500">*</span></label>
                <input id="user-email" type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent" required />
              </div>
              <div>
                <label htmlFor="user-tel" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldPhone')}</label>
                <input id="user-tel" type="text" value={form.telephone} onChange={e => updateField('telephone', e.target.value)} placeholder="+225 07 00 00 00" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldRole')} <span className="text-red-500">*</span></label>
                <select id="user-role" value={form.role} onChange={e => updateField('role', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent" required>
                  <option value="Administrateur">{t('adminUsers.roleAdmin')}</option>
                  <option value="Manager">{t('adminUsers.roleManager')}</option>
                  <option value="Comptable">{t('adminUsers.roleAccountant')}</option>
                  <option value="Lecteur">{t('adminUsers.roleReader')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="user-dept" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldDepartment')}</label>
                <select id="user-dept" value={form.departement} onChange={e => updateField('departement', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent">
                  <option value="Direction">{t('adminUsers.deptDirection')}</option>
                  <option value="Comptabilite">{t('adminUsers.deptAccounting')}</option>
                  <option value="Tresorerie">{t('adminUsers.deptTreasury')}</option>
                  <option value="Commercial">{t('adminUsers.deptSales')}</option>
                  <option value="IT">{t('adminUsers.deptIT')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-status" className="block text-sm font-medium text-gray-700 mb-1">{t('adminUsers.fieldStatus')}</label>
                <select id="user-status" value={form.status} onChange={e => updateField('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent">
                  <option value="Actif">{t('adminUsers.statusActive')}</option>
                  <option value="Inactif">{t('adminUsers.statusInactive')}</option>
                </select>
              </div>
              <div />
            </div>
            {modalMode === 'create' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                📧 {t('adminUsers.inviteNotice')}
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">{t('adminUsers.cancel')}</button>
              <button type="submit" className="px-4 py-2 bg-[#C0322B] text-white rounded-lg text-sm hover:bg-[#dc2626]">
                {modalMode === 'create' ? t('adminUsers.create') : t('adminUsers.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const userCountByRole = (roleName: string) => users.filter((u: any) => u.role === roleName).length;

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">{t('adminUsers.title')}</h2>
      <AdminUsersTabBar tabs={tabs} active={subTab} onSelect={setSubTab} />

      {subTab === 0 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateModal} className="px-4 py-2 bg-[#C0322B] text-white rounded-lg text-sm flex items-center space-x-2">
              <Plus className="w-4 h-4" /><span>{t('adminUsers.addUser')}</span>
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{loading ? t('adminUsers.loading') : t('adminUsers.noUsers')}</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colFullName')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colEmail')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colPhone')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colDepartment')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colRole')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colStatus')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colLastLogin')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.prenom} {u.nom}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.telephone}</td>
                    <td className="px-4 py-3 text-gray-600">{u.departement}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.derniereConnexion || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => openEditModal(u)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title={t('adminUsers.tooltipEdit')}><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleResendInvitation(u)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600" title={t('adminUsers.tooltipResendInvite')}><Send className="w-4 h-4" /></button>
                        <button onClick={() => toggleUserStatus(u)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title={t('adminUsers.tooltipDeactivate')}><UserX className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}

      {subTab === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {roles.map(role => (
            <div key={role.nom} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">{t(role.nomKey)}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[role.nom]}`}>{userCountByRole(role.nom)} {userCountByRole(role.nom) > 1 ? t('adminUsers.usersPlural') : t('adminUsers.userSingular')}</span>
              </div>
              <p className="text-sm text-gray-500">{t(role.descKey)}</p>
              <div className="flex flex-wrap gap-1.5">
                {role.permKeys.map(permKey => (
                  <span key={permKey} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t(permKey)}</span>
                ))}
              </div>
              <button onClick={() => setSubTab(2)} className="w-full mt-2 px-3 py-2 border border-[#C0322B] text-[#C0322B] rounded-lg text-sm hover:bg-[#C0322B]/5 flex items-center justify-center space-x-2">
                <Key className="w-4 h-4" /><span>{t('adminUsers.editPermissions')}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 2 && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            ⚠️ {t('adminUsers.permMatrixNoteBefore')} <strong>{t('adminUsers.permMatrixRef')}</strong>{t('adminUsers.permMatrixNoteAfter')}
          </div>
          <div className="flex items-center space-x-4">
            <label htmlFor="perm-role" className="text-sm font-medium text-gray-700">{t('adminUsers.roleLabel')}</label>
            <select
              id="perm-role"
              value={selectedRole}
              onChange={e => { setSelectedRole(e.target.value); setPermMatrix(defaultPermissions[e.target.value]); }}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#C0322B] focus:border-transparent"
            >
              <option value="Administrateur">{t('adminUsers.roleAdmin')}</option>
              <option value="Manager">{t('adminUsers.roleManager')}</option>
              <option value="Comptable">{t('adminUsers.roleAccountant')}</option>
              <option value="Lecteur">{t('adminUsers.roleReader')}</option>
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colModule')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('adminUsers.colRead')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('adminUsers.colWrite')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('adminUsers.colDelete')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('adminUsers.colAdminister')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modules.map((mod, ri) => (
                  <tr key={mod} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t(mod)}</td>
                    {[0, 1, 2, 3].map(ci => (
                      <td key={ci} className="px-4 py-3 text-center">
                        <input type="checkbox" checked={permMatrix[ri]?.[ci] ?? false} onChange={() => togglePerm(ri, ci)}
                          className="w-4 h-4 text-[#C0322B] border-gray-300 rounded focus:ring-[#C0322B]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button onClick={savePermissions} className="px-4 py-2 bg-[#C0322B] text-white rounded-lg text-sm hover:bg-[#dc2626]">
              {t('adminUsers.savePermissions')}
            </button>
          </div>
        </div>
      )}

      {subTab === 3 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => toast(t('adminUsers.revokeSessionsInfo'), { icon: 'ℹ️' })} className="px-4 py-2 bg-[#C0322B] text-white rounded-lg text-sm flex items-center space-x-2">
              <LogOut className="w-4 h-4" /><span>{t('adminUsers.logoutAllSessions')}</span>
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <div className="p-8 text-center text-gray-400">{t('adminUsers.noActiveSession')}</div>
          </div>
        </div>
      )}

      {subTab === 4 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border overflow-x-auto">
            {historique.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{loading ? t('adminUsers.loading') : t('adminUsers.noLoginRecorded')}</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colDateTime')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colUser')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colAction')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('adminUsers.colDetails')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historique.map((h: any) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{h.date}</td>
                    <td className="px-4 py-3 font-medium">{h.utilisateur}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{h.evenement}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{t('adminUsers.eventsCount', { count: String(historique.length) })}</span>
          </div>
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default AdminUsers;
