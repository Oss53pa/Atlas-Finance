import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Key, Globe, FileText, Plus, Trash2, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../../contexts/DataContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = ['Politique mots de passe', 'Authentification 2FA', 'IP autorisees', 'Journal securite'];
const tabIcons = [Key, Shield, Globe, FileText];

const eventTypes = ['Tous', 'Connexion reussie', 'Connexion echouee', 'Changement role', 'Changement MDP', '2FA desactive', 'Verrouillage compte', 'Export donnees'];

const AdminSecurity: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);

  // Password policy
  const [minLength, setMinLength] = useState(8);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireDigit, setRequireDigit] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [expiration, setExpiration] = useState('90j');
  const [history, setHistory] = useState(3);
  const [lockAttempts, setLockAttempts] = useState(5);
  const [lockDuration, setLockDuration] = useState('30min');

  // 2FA
  const [forceAdmin2FA, setForceAdmin2FA] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // IP
  const [ipRestriction, setIpRestriction] = useState(false);
  const [ips, setIps] = useState<any[]>([]);
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newIpDesc, setNewIpDesc] = useState('');

  // Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logUser, setLogUser] = useState('Tous');
  const [logEvent, setLogEvent] = useState('Tous');
  const [logPage, setLogPage] = useState(1);

  const saveSetting = useCallback(async (key: string, value: any) => {
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
  }, [adapter]);

  useEffect(() => {
    const load = async () => {
      try {
        const allSettings = await adapter.getAll<any>('settings');

        // Password policy
        const policySetting = allSettings.find((s: any) => s.key === 'admin_security_password_policy');
        if (policySetting?.value) {
          const p = JSON.parse(policySetting.value);
          if (p.minLength !== undefined) setMinLength(p.minLength);
          if (p.requireUpper !== undefined) setRequireUpper(p.requireUpper);
          if (p.requireDigit !== undefined) setRequireDigit(p.requireDigit);
          if (p.requireSpecial !== undefined) setRequireSpecial(p.requireSpecial);
          if (p.expiration) setExpiration(p.expiration);
          if (p.history !== undefined) setHistory(p.history);
          if (p.lockAttempts !== undefined) setLockAttempts(p.lockAttempts);
          if (p.lockDuration) setLockDuration(p.lockDuration);
        }

        // 2FA users
        const tfaSetting = allSettings.find((s: any) => s.key === 'admin_security_2fa');
        if (tfaSetting?.value) {
          const tfa = JSON.parse(tfaSetting.value);
          if (tfa.forceAdmin !== undefined) setForceAdmin2FA(tfa.forceAdmin);
          if (tfa.users) setUsers(tfa.users);
        }

        // IPs
        const ipSetting = allSettings.find((s: any) => s.key === 'admin_security_ips');
        if (ipSetting?.value) {
          const ipData = JSON.parse(ipSetting.value);
          if (ipData.restriction !== undefined) setIpRestriction(ipData.restriction);
          if (ipData.list) setIps(ipData.list);
        }

        // Audit logs for security journal
        try {
          const auditLogs = await adapter.getAuditTrail({
            orderBy: { field: 'timestamp', direction: 'desc' as const },
            limit: 100,
          });
          setLogs(auditLogs.map((log: any) => {
            const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || '');
            const action = log.action || '';
            let event = action;
            let severity: 'info' | 'warning' | 'danger' = 'info';
            if (action.includes('login') || action.includes('connexion')) {
              event = 'Connexion reussie';
            } else if (action.includes('login_failed') || action.includes('echec')) {
              event = 'Connexion echouee';
              severity = 'warning';
            } else if (action.includes('role')) {
              event = 'Changement role';
            } else if (action.includes('2fa')) {
              event = '2FA desactive';
              severity = 'danger';
            } else if (action.includes('lock')) {
              event = 'Verrouillage compte';
              severity = 'danger';
            } else if (action.includes('export')) {
              event = 'Export donnees';
              severity = 'warning';
            } else if (action.includes('password') || action.includes('mdp')) {
              event = 'Changement MDP';
            } else if (action.includes('delete') || action.includes('suppr')) {
              severity = 'danger';
            } else if (action.includes('update') || action.includes('modif')) {
              severity = 'warning';
            }
            return {
              date: log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '',
              user: log.userId || 'Systeme',
              event,
              ip: '',
              nav: '',
              severity,
              details,
            };
          }));
        } catch (err) { /* silent */
          // auditTrail may not be available
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  const toggle2FA = async (id: number) => {
    const updated = users.map(u => u.id === id ? { ...u, twoFa: !u.twoFa } : u);
    setUsers(updated);
    await saveSetting('admin_security_2fa', { forceAdmin: forceAdmin2FA, users: updated });
  };

  const addIp = async () => {
    if (!newIp.trim()) return;
    const newList = [...ips, { ip: newIp, description: newIpDesc || '-', date: new Date().toISOString().split('T')[0], par: 'Admin' }];
    setIps(newList);
    setNewIp('');
    setNewIpDesc('');
    setShowAddIpModal(false);
    await saveSetting('admin_security_ips', { restriction: ipRestriction, list: newList });
    toast.success('Adresse IP ajoutee');
  };

  const removeIp = async (ip: string) => {
    const newList = ips.filter(i => i.ip !== ip);
    setIps(newList);
    await saveSetting('admin_security_ips', { restriction: ipRestriction, list: newList });
    toast.success('Adresse IP supprimee');
  };

  const filteredLogs = logs.filter(l => {
    if (logUser !== 'Tous' && l.user !== logUser) return false;
    if (logEvent !== 'Tous' && l.event !== logEvent) return false;
    return true;
  });

  const severityBadge = (s: 'info' | 'warning' | 'danger') => {
    const cls = s === 'info' ? 'bg-blue-100 text-blue-700' : s === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{s}</span>;
  };

  const eventBadge = (e: string) => {
    const colors: Record<string, string> = {
      'Connexion reussie': 'bg-green-100 text-green-700',
      'Connexion echouee': 'bg-red-100 text-red-700',
      'Changement role': 'bg-blue-100 text-blue-700',
      'Changement MDP': 'bg-primary-100 text-primary-700',
      '2FA desactive': 'bg-orange-100 text-orange-700',
      'Verrouillage compte': 'bg-red-100 text-red-800',
      'Export donnees': 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[e] || 'bg-gray-100 text-gray-700'}`}>{e}</span>;
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button type="button" onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'tranprimary-x-6' : 'tranprimary-x-1'}`} />
    </button>
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Chargement...</span></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t, i) => {
          const Icon = tabIcons[i];
          return (
            <button key={t} onClick={() => setSubTab(i)} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t font-medium transition-colors ${subTab === i ? 'bg-white border border-b-white -mb-[1px] text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{t}
            </button>
          );
        })}
      </div>

      {/* Politique mots de passe */}
      {subTab === 0 && (
        <div className="bg-white rounded-lg border p-6 space-y-5 max-w-2xl">
          <h3 className="font-semibold text-lg">Politique de mots de passe</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Longueur minimale</label>
              <input type="number" min={6} max={32} value={minLength} onChange={e => setMinLength(+e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Historique mots de passe</label>
              <input type="number" min={0} max={24} value={history} onChange={e => setHistory(+e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              <p className="text-xs text-gray-500 mt-1">Anciens mots de passe interdits</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between"><span className="text-sm">Majuscule requise</span><Toggle checked={requireUpper} onChange={() => setRequireUpper(!requireUpper)} /></label>
            <label className="flex items-center justify-between"><span className="text-sm">Chiffre requis</span><Toggle checked={requireDigit} onChange={() => setRequireDigit(!requireDigit)} /></label>
            <label className="flex items-center justify-between"><span className="text-sm">Caractere special requis</span><Toggle checked={requireSpecial} onChange={() => setRequireSpecial(!requireSpecial)} /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expiration</label>
              <select value={expiration} onChange={e => setExpiration(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="30j">30 jours</option><option value="60j">60 jours</option><option value="90j">90 jours</option><option value="jamais">Jamais</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Verrouillage apres tentatives</label>
              <input type="number" min={1} max={20} value={lockAttempts} onChange={e => setLockAttempts(+e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duree de verrouillage</label>
            <select value={lockDuration} onChange={e => setLockDuration(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="15min">15 minutes</option><option value="30min">30 minutes</option><option value="1h">1 heure</option><option value="permanent">Permanent</option>
            </select>
          </div>
          <button onClick={async () => {
            await saveSetting('admin_security_password_policy', { minLength, requireUpper, requireDigit, requireSpecial, expiration, history, lockAttempts, lockDuration });
            toast.success('Politique de mots de passe enregistree');
          }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Enregistrer la politique</button>
        </div>
      )}

      {/* 2FA */}
      {subTab === 1 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">La double authentification protege les comptes contre les acces non autorises. Il est fortement recommande de l'activer pour tous les utilisateurs.</p>
          </div>
          <div className={`flex items-center justify-between rounded-lg p-4 border ${forceAdmin2FA ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className="font-medium text-sm">Forcer 2FA pour tous les administrateurs</p>
              <p className="text-xs text-gray-500">Les administrateurs devront activer la 2FA lors de leur prochaine connexion</p>
            </div>
            <Toggle checked={forceAdmin2FA} onChange={() => setForceAdmin2FA(!forceAdmin2FA)} />
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-center px-4 py-3 font-medium">2FA Active</th>
                  <th className="text-left px-4 py-3 font-medium">Methode</th>
                  <th className="text-left px-4 py-3 font-medium">Derniere verification</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun utilisateur configure</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.nom}</td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-center"><Toggle checked={u.twoFa} onChange={() => toggle2FA(u.id)} /></td>
                    <td className="px-4 py-3">{u.methode}</td>
                    <td className="px-4 py-3 text-gray-500">{u.derniere}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={async () => {
            await saveSetting('admin_security_2fa', { forceAdmin: forceAdmin2FA, users });
            toast.success('Configuration 2FA enregistree');
          }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Enregistrer</button>
        </div>
      )}

      {/* IP autorisees */}
      {subTab === 2 && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between rounded-lg p-4 border ${ipRestriction ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className="font-medium text-sm">Activer la restriction par IP</p>
              <p className="text-xs text-gray-500">Seules les adresses IP listees pourront acceder a l'application</p>
            </div>
            <Toggle checked={ipRestriction} onChange={async () => {
              const newVal = !ipRestriction;
              setIpRestriction(newVal);
              await saveSetting('admin_security_ips', { restriction: newVal, list: ips });
            }} />
          </div>
          {ipRestriction && (
            <>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-700">Assurez-vous que votre adresse IP actuelle est dans la liste avant d'activer cette restriction.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setShowAddIpModal(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700">
                  <Plus className="w-4 h-4" />Ajouter une IP
                </button>
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Adresse IP</th>
                      <th className="text-left px-4 py-3 font-medium">Description</th>
                      <th className="text-left px-4 py-3 font-medium">Date ajout</th>
                      <th className="text-left px-4 py-3 font-medium">Ajoute par</th>
                      <th className="text-right px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ips.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucune adresse IP configuree</td></tr>
                    ) : ips.map(i => (
                      <tr key={i.ip} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{i.ip}</td>
                        <td className="px-4 py-3">{i.description}</td>
                        <td className="px-4 py-3 text-gray-500">{i.date}</td>
                        <td className="px-4 py-3">{i.par}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => removeIp(i.ip)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {showAddIpModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
                <h3 className="font-semibold text-lg">Ajouter une adresse IP</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Adresse IP ou plage CIDR</label>
                  <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="192.168.1.0/24" className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input value={newIpDesc} onChange={e => setNewIpDesc(e.target.value)} placeholder="Bureau, VPN, etc." className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddIpModal(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Annuler</button>
                  <button onClick={addIp} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Confirmer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Journal securite */}
      {subTab === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end bg-white rounded-lg border p-4">
            <div>
              <label className="block text-xs font-medium mb-1">Date debut</label>
              <input type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Date fin</label>
              <input type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Utilisateur</label>
              <select value={logUser} onChange={e => setLogUser(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option>Tous</option>
                {[...new Set(logs.map(l => l.user))].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type evenement</label>
              <select value={logEvent} onChange={e => setLogEvent(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                {eventTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 px-2 py-1.5"><Search className="w-4 h-4" />Filtrer</button>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date/Heure</th>
                  <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-medium">Evenement</th>
                  <th className="text-left px-4 py-3 font-medium">Adresse IP</th>
                  <th className="text-left px-4 py-3 font-medium">Navigateur</th>
                  <th className="text-left px-4 py-3 font-medium">Severite</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun evenement de securite enregistre</td></tr>
                ) : filteredLogs.map((l, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.date}</td>
                    <td className="px-4 py-3 font-medium">{l.user}</td>
                    <td className="px-4 py-3">{eventBadge(l.event)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.ip || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.nav || '—'}</td>
                    <td className="px-4 py-3">{severityBadge(l.severity)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{filteredLogs.length} evenement(s)</span>
            <div className="flex gap-1">
              <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Precedent</button>
              <span className="px-3 py-1">Page {logPage}</span>
              <button onClick={() => setLogPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-gray-50">Suivant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurity;
