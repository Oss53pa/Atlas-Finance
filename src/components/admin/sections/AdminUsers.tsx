import React, { useState } from 'react';
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

const mockUsers = [
  { id: 1, prenom: 'Kouadio', nom: 'Amani', email: 'k.amani@atlasfinance.ci', telephone: '+225 07 08 12 34', departement: 'Direction', role: 'Administrateur', status: 'Actif', derniereConnexion: '2026-03-14 09:12' },
  { id: 2, prenom: 'Aissatou', nom: 'Diallo', email: 'a.diallo@atlasfinance.ci', telephone: '+225 05 44 78 90', departement: 'Comptabilite', role: 'Comptable', status: 'Actif', derniereConnexion: '2026-03-14 08:45' },
  { id: 3, prenom: 'Moussa', nom: 'Traore', email: 'm.traore@atlasfinance.ci', telephone: '+225 01 23 45 67', departement: 'Tresorerie', role: 'Manager', status: 'Actif', derniereConnexion: '2026-03-13 17:30' },
  { id: 4, prenom: 'Fatou', nom: 'Kone', email: 'f.kone@atlasfinance.ci', telephone: '+225 07 65 43 21', departement: 'Commercial', role: 'Lecteur', status: 'Inactif', derniereConnexion: '2026-02-28 14:00' },
  { id: 5, prenom: 'Seydou', nom: 'Ouattara', email: 's.ouattara@atlasfinance.ci', telephone: '+225 05 11 22 33', departement: 'IT', role: 'Manager', status: 'Actif', derniereConnexion: '2026-03-14 07:58' },
];

const mockSessions = [
  { id: 1, utilisateur: 'Kouadio Amani', ip: '192.168.1.45', navigateur: 'Chrome 122 / Windows 11', debut: '2026-03-14 09:12', duree: '2h 15min', localisation: 'Abidjan, CI' },
  { id: 2, utilisateur: 'Aissatou Diallo', ip: '10.0.0.88', navigateur: 'Firefox 124 / macOS 14', debut: '2026-03-14 08:45', duree: '2h 42min', localisation: 'Abidjan, CI' },
  { id: 3, utilisateur: 'Seydou Ouattara', ip: '172.16.0.12', navigateur: 'Edge 122 / Windows 11', debut: '2026-03-14 07:58', duree: '3h 29min', localisation: 'Bouake, CI' },
];

const mockHistorique = [
  { id: 1, date: '2026-03-14 09:12', utilisateur: 'Kouadio Amani', evenement: 'Connexion', ip: '192.168.1.45', navigateur: 'Chrome 122', localisation: 'Abidjan', details: 'Connexion reussie' },
  { id: 2, date: '2026-03-14 08:45', utilisateur: 'Aissatou Diallo', evenement: 'Connexion', ip: '10.0.0.88', navigateur: 'Firefox 124', localisation: 'Abidjan', details: 'Connexion reussie' },
  { id: 3, date: '2026-03-13 23:15', utilisateur: 'Fatou Kone', evenement: 'Echec', ip: '41.202.219.70', navigateur: 'Safari 17', localisation: 'Yamoussoukro', details: 'Mot de passe incorrect (3e tentative)' },
  { id: 4, date: '2026-03-13 17:30', utilisateur: 'Moussa Traore', evenement: 'Deconnexion', ip: '10.0.0.22', navigateur: 'Chrome 122', localisation: 'Abidjan', details: 'Deconnexion manuelle' },
  { id: 5, date: '2026-03-13 14:02', utilisateur: 'Seydou Ouattara', evenement: 'Connexion', ip: '172.16.0.12', navigateur: 'Edge 122', localisation: 'Bouake', details: 'Connexion reussie' },
];

const roles = [
  { nom: 'Administrateur', description: 'Acces complet a toutes les fonctionnalites du systeme', utilisateurs: 1, permissions: ['Tout lire', 'Tout ecrire', 'Supprimer', 'Administrer', 'Gerer utilisateurs'] },
  { nom: 'Manager', description: 'Supervision des operations et validation des ecritures', utilisateurs: 2, permissions: ['Tout lire', 'Ecrire ecritures', 'Valider', 'Rapports', 'Export'] },
  { nom: 'Comptable', description: 'Saisie et consultation des ecritures comptables', utilisateurs: 1, permissions: ['Lire ecritures', 'Ecrire ecritures', 'Rapports', 'Journaux'] },
  { nom: 'Lecteur', description: 'Consultation uniquement, aucune modification possible', utilisateurs: 1, permissions: ['Lire ecritures', 'Lire rapports', 'Lire tiers'] },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.role) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Format d\'email invalide');
      return;
    }
    if (modalMode === 'create') {
      if (!form.password || form.password.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caracteres');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }
      toast.success(`Utilisateur ${form.prenom} ${form.nom} cree avec succes`);
    } else {
      toast.success(`Utilisateur ${form.prenom} ${form.nom} mis a jour`);
    }
    setShowModal(false);
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

  // ─── MODAL ─────────────────────────────────────────────
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

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Utilisateurs & Droits</h2>
      <TabBar tabs={tabs} active={subTab} />

      {/* ─── TAB 0: LISTE UTILISATEURS ──────────────────── */}
      {subTab === 0 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateModal} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm flex items-center space-x-2">
              <Plus className="w-4 h-4" /><span>Ajouter un utilisateur</span>
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
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
                {mockUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.prenom} {u.nom}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.telephone}</td>
                    <td className="px-4 py-3 text-gray-600">{u.departement}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[u.role]}`}>{u.role}</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.derniereConnexion}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => openEditModal(u)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toast.success(`Utilisateur ${u.prenom} ${u.nom} desactive`)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Desactiver"><UserX className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 1: ROLES ───────────────────────────────── */}
      {subTab === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {roles.map(role => (
            <div key={role.nom} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">{role.nom}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColor[role.nom]}`}>{role.utilisateurs} utilisateur{role.utilisateurs > 1 ? 's' : ''}</span>
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

      {/* ─── TAB 2: PERMISSIONS ─────────────────────────── */}
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
            <button onClick={() => toast.success(`Permissions du role ${selectedRole} enregistrees`)} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm hover:bg-[#dc2626]">
              Enregistrer les permissions
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SESSIONS ACTIVES ────────────────────── */}
      {subTab === 3 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => toast.success('Toutes les sessions ont ete deconnectees')} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm flex items-center space-x-2">
              <LogOut className="w-4 h-4" /><span>Deconnecter toutes les sessions</span>
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse IP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Navigateur / OS</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Debut session</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Duree</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Localisation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockSessions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.utilisateur}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.ip}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.navigateur}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.debut}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.duree}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs flex items-center space-x-1"><Globe className="w-3 h-3" /><span>{s.localisation}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => toast.success(`Session de ${s.utilisateur} deconnectee`)} className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                        Deconnecter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: HISTORIQUE CONNEXIONS ────────────────── */}
      {subTab === 4 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date debut</label>
                <input type="date" defaultValue="2026-03-01" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date fin</label>
                <input type="date" defaultValue="2026-03-14" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Utilisateur</label>
                <select className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent">
                  <option value="">Tous</option>
                  {mockUsers.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Evenement</label>
                <select className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#ef4444] focus:border-transparent">
                  <option value="">Tous</option>
                  <option value="Connexion">Connexion</option>
                  <option value="Deconnexion">Deconnexion</option>
                  <option value="Echec">Echec</option>
                </select>
              </div>
              <button className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm flex items-center space-x-2">
                <Filter className="w-4 h-4" /><span>Filtrer</span>
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date / Heure</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Evenement</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Adresse IP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Navigateur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Localisation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockHistorique.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{h.date}</td>
                    <td className="px-4 py-3 font-medium">{h.utilisateur}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        h.evenement === 'Connexion' ? 'bg-green-100 text-green-700' :
                        h.evenement === 'Deconnexion' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>{h.evenement}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{h.ip}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{h.navigateur}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.localisation}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Affichage 1-5 sur 234</span>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-xs">Precedent</button>
              <button className="px-3 py-1 bg-[#ef4444] text-white rounded-lg text-xs">1</button>
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-xs">2</button>
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-xs">3</button>
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-xs">Suivant</button>
            </div>
          </div>
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default AdminUsers;
