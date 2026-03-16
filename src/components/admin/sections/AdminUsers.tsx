import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Edit2, UserX, Shield, Eye, Key, Clock,
  LogOut, Globe, Monitor, X, Search, ChevronDown, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../../contexts/DataContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const roles = [
  { nom: 'Administrateur', description: 'Acces complet a toutes les fonctionnalites du systeme', permissions: ['Tout lire', 'Tout ecrire', 'Supprimer', 'Administrer', 'Gerer utilisateurs'] },
  { nom: 'Manager', description: 'Supervision des operations et validation des ecritures', permissions: ['Tout lire', 'Ecrire ecritures', 'Valider', 'Rapports', 'Export'] },
  { nom: 'Comptable', description: 'Saisie et consultation des ecritures comptables', permissions: ['Lire ecritures', 'Ecrire ecritures', 'Rapports', 'Journaux'] },
  { nom: 'Lecteur', description: 'Consultation uniquement, aucune modification possible', permissions: ['Lire ecritures', 'Lire rapports', 'Lire tiers'] },
];

const modules = ['Ecritures', 'Journaux', 'Plan comptable', 'Tiers', 'Rapports', 'Tresorerie', 'Immobilisations', 'Administration'];

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

const AdminUsers: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const [users, setUsers] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', role: 'Comptable', password: '', confirmPassword: '',
    telephone: '', departement: 'Comptabilite', status: 'Actif',
  });
  const [selectedRole, setSelectedRole] = useState('Administrateur');
  const [permMatrix, setPermMatrix] = useState(defaultPermissions['Administrateur']);

  const tabs = ['Liste utilisateurs', 'Roles', 'Permissions', 'Sessions actives', 'Historique connexions'];

  const saveSetting = async (key: string, value: any) => {
    const data = { key, value: JSON.stringify(value), updatedAt: new Date().toISOString() };
    try {
      const existing = await adapter.getById('settings', key);
      if (existing) {
        await adapter.update('settings', key, data);
      } else {
        await adapter.create('settings', data);
      }
    } catch {
      try { await adapter.create('settings', data); } catch {}
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [allSettings, auditLogs] = await Promise.all([
          adapter.getAll<any>('settings'),
          adapter.getAll<any>('auditLogs'),
        ]);

        const usersSetting = allSettings.find((s: any) => s.key === 'admin_users');
        if (usersSetting?.value) {
          setUsers(JSON.parse(usersSetting.value));
        }

        const connectionLogs = auditLogs
          .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 50)
          .map((l: any) => ({
            id: l.id,
            date: new Date(l.timestamp).toLocaleString('fr-FR'),
            utilisateur: l.userId || 'Systeme',
            evenement: l.action || 'Action',
            ip: '-',
            navigateur: '-',
            localisation: '-',
            details: l.details || '',
          }));
        setHistorique(connectionLogs);
      } catch (err) {
        console.error('Error loading admin users data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  const openCreateModal = () => {
    setForm({ prenom: '', nom: '', email: '', role: 'Comptable', password: '', confirmPassword: '', telephone: '', departement: 'Comptabilite', status: 'Actif' });
    setEditingUser(null);
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setForm({ prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, password: '', confirmPassword: '', telephone: user.telephone, departement: user.departement, status: user.status });
    setEditingUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.role) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Format d\'email invalide');
      return;
    }
    try {
      let updatedUsers;
      if (modalMode === 'create') {
        if (!form.password || form.password.length < 8) {
          toast.error('Le mot de passe doit contenir au moins 8 caracteres');
          return;
        }
        if (form.password !== form.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          return;
        }
        const newUser = {
          id: Date.now(),
          prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone,
          departement: form.departement, role: form.role, status: form.status, derniereConnexion: '-',
        };
        updatedUsers = [...users, newUser];
        toast.success(`Utilisateur ${form.prenom} ${form.nom} cree avec succes`);
      } else {
        updatedUsers = users.map((u: any) => u.id === editingUser?.id
          ? { ...u, prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone, departement: form.departement, role: form.role, status: form.status }
          : u
        );
        toast.success(`Utilisateur ${form.prenom} ${form.nom} mis a jour`);
      }
      setUsers(updatedUsers);
      await saveSetting('admin_users', updatedUsers);
      setShowModal(false);
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const toggleUserStatus = async (u: any) => {
    const updatedUsers = users.map((u2: any) => u2.id === u.id ? { ...u2, status: u.status === 'Actif' ? 'Inactif' : 'Actif' } : u2);
    setUsers(updatedUsers);
    await saveSetting('admin_users', updatedUsers);
    toast.success(`Utilisateur ${u.prenom} ${u.nom} ${u.status === 'Actif' ? 'desactive' : 'reactive'}`);
  };

  const savePermissions = async () => {
    try {
      const allSettings = await adapter.getAll<any>('settings');
      const permSetting = allSettings.find((s: any) => s.key === 'admin_permissions');
      const existing = permSetting?.value ? JSON.parse(permSetting.value) : {};
      existing[selectedRole] = permMatrix;
      await saveSetting('admin_permissions', existing);
      toast.success(`Permissions du role ${selectedRole} enregistrees`);
    } catch { toast.error('Erreur'); }
  };

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const TabBar = ({ tabs, active }: { tabs: string[]; active: number }) => (
    <div className="border-b border-gray-200 mb-6 overflow-x-auto">
      <nav className="flex space-x-1 -mb-px">
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setSubTab(i)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              active === i ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );

  const togglePerm = (row: number, col: number) => {
    setPermMatrix(prev => prev.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? !c : c) : r));
  };

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-bold">{modalMode === 'create' ? 'Creer un utilisateur' : 'Modifier l\'utilisateur'}</h3>
            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom <span className="text-red-500">*</span></label>
                <input type="text" value={form.prenom} onChange={e => updateField('prenom', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                <input type="text" value={form.nom} onChange={e => updateField('nom', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input type="text" value={form.telephone} onChange={e => updateField('telephone', e.target.value)} placeholder="+225 07 00 00 00" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                <select value={form.role} onChange={e => updateField('role', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" required>
                  <option value="Administrateur">Administrateur</option>
                  <option value="Manager">Manager</option>
                  <option value="Comptable">Comptable</option>
                  <option value="Lecteur">Lecteur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departement</label>
                <select value={form.departement} onChange={e => updateField('departement', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent">
                  <option value="Direction">Direction</option>
                  <option value="Comptabilite">Comptabilite</option>
                  <option value="Tresorerie">Tresorerie</option>
                  <option value="Commercial">Commercial</option>
                  <option value="IT">IT</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={form.status} onChange={e => updateField('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent">
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
              <div />
            </div>
            {modalMode === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe <span className="text-red-500">*</span></label>
                  <input type="password" value={form.password} onChange={e => updateField('password', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" required minLength={8} />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 caracteres</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer mot de passe <span className="text-red-500">*</span></label>
                  <input type="password" value={form.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" required />
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              <button type="submit" className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm hover:bg-[#dc2626]">
                {modalMode === 'create' ? 'Creer' : 'Enregistrer'}
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
      <h2 className="text-lg font-bold mb-4">Utilisateurs & Droits</h2>
      <TabBar tabs={tabs} active={subTab} />

      {subTab === 0 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateModal} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm flex items-center space-x-2">
              <Plus className="w-4 h-4" /><span>Ajouter un utilisateur</span>
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{loading ? 'Chargement...' : 'Aucun utilisateur. Ajoutez-en un pour commencer.'}</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom complet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Telephone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Departement</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Derniere connexion</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
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
                        <button onClick={() => openEditModal(u)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleUserStatus(u)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Desactiver"><UserX className="w-4 h-4" /></button>
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
                <h3 className="font-semibold text-base">{role.nom}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[role.nom]}`}>{userCountByRole(role.nom)} utilisateur{userCountByRole(role.nom) > 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-gray-500">{role.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map(perm => (
                  <span key={perm} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{perm}</span>
                ))}
              </div>
              <button onClick={() => setSubTab(2)} className="w-full mt-2 px-3 py-2 border border-[#ef4444] text-[#ef4444] rounded-lg text-sm hover:bg-[#ef4444]/5 flex items-center justify-center space-x-2">
                <Key className="w-4 h-4" /><span>Modifier les permissions</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 2 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Role :</label>
            <select
              value={selectedRole}
              onChange={e => { setSelectedRole(e.target.value); setPermMatrix(defaultPermissions[e.target.value]); }}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
            >
              <option value="Administrateur">Administrateur</option>
              <option value="Manager">Manager</option>
              <option value="Comptable">Comptable</option>
              <option value="Lecteur">Lecteur</option>
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Module</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Lire</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Ecrire</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Supprimer</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Administrer</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modules.map((mod, ri) => (
                  <tr key={mod} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{mod}</td>
                    {[0, 1, 2, 3].map(ci => (
                      <td key={ci} className="px-4 py-3 text-center">
                        <input type="checkbox" checked={permMatrix[ri]?.[ci] ?? false} onChange={() => togglePerm(ri, ci)}
                          className="w-4 h-4 text-[#ef4444] border-gray-300 rounded focus:ring-[#ef4444]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button onClick={savePermissions} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm hover:bg-[#dc2626]">
              Enregistrer les permissions
            </button>
          </div>
        </div>
      )}

      {subTab === 3 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => toast.success('Toutes les sessions ont ete deconnectees')} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm flex items-center space-x-2">
              <LogOut className="w-4 h-4" /><span>Deconnecter toutes les sessions</span>
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <div className="p-8 text-center text-gray-400">Aucune session active</div>
          </div>
        </div>
      )}

      {subTab === 4 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border overflow-x-auto">
            {historique.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{loading ? 'Chargement...' : 'Aucune connexion enregistree'}</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date / Heure</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
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
            <span>{historique.length} evenement(s)</span>
          </div>
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default AdminUsers;
