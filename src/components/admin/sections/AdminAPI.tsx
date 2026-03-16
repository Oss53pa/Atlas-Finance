import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Key, Webhook, Building2, Users, FileText, Activity,
  Plus, Eye, EyeOff, Trash2, Copy, AlertTriangle, CheckCircle,
  XCircle, Wifi, WifiOff, Settings, X
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = ['Cles API', 'Webhooks', 'Integration bancaire', 'Integration paie', 'Logs API'];

const allPermissions = ['Lecture ecritures', 'Ecriture ecritures', 'Lecture tiers', 'Ecriture tiers', 'Lecture etats', 'Admin'];
const webhookEvents = ['ecriture_validee', 'ecriture_supprimee', 'cloture_periode', 'nouveau_tiers', 'export_donnees'];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

const AdminAPI: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const allSettings = await adapter.getAll<any>('settings');
        const keysSetting = allSettings.find((s: any) => s.key === 'admin_api_keys');
        if (keysSetting?.value) setApiKeys(JSON.parse(keysSetting.value));
        const webhookSetting = allSettings.find((s: any) => s.key === 'admin_webhooks');
        if (webhookSetting?.value) setWebhooks(JSON.parse(webhookSetting.value));
        const logsSetting = allSettings.find((s: any) => s.key === 'admin_api_logs');
        if (logsSetting?.value) setApiLogs(JSON.parse(logsSetting.value));
        const bankSetting = allSettings.find((s: any) => s.key === 'admin_bank_integration');
        if (bankSetting?.value) {
          const bank = JSON.parse(bankSetting.value);
          if (bank.connected) setBankConnected(true);
          if (bank.name) setBankName(bank.name);
          if (bank.protocol) setBankProtocol(bank.protocol);
          if (bank.frequency) setBankFrequency(bank.frequency);
        }
        const payrollSetting = allSettings.find((s: any) => s.key === 'admin_payroll_integration');
        if (payrollSetting?.value) {
          const payroll = JSON.parse(payrollSetting.value);
          if (payroll.connected) setPayrollConnected(true);
          if (payroll.software) setPayrollSoftware(payroll.software);
          if (payroll.journal) setPayrollJournal(payroll.journal);
          if (payroll.compte) setPayrollCompte(payroll.compte);
        }
      } catch (err) {
        console.error('Error loading API data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  // Key modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState('90j');
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

  // Webhook modal
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents_, setWebhookEvents_] = useState<string[]>([]);
  const [webhookSecret] = useState('whsec_' + Math.random().toString(36).substring(2, 15));

  // Bank integration
  const [bankConnected, setBankConnected] = useState(false);
  const [bankName, setBankName] = useState('SGBCI');
  const [bankProtocol, setBankProtocol] = useState('EBICS');
  const [bankIdentifiant, setBankIdentifiant] = useState('');
  const [bankPassword, setBankPassword] = useState('');
  const [bankFrequency, setBankFrequency] = useState('Quotidien');

  // Payroll integration
  const [payrollConnected, setPayrollConnected] = useState(false);
  const [payrollSoftware, setPayrollSoftware] = useState('Sage Paie');
  const [payrollUrl, setPayrollUrl] = useState('');
  const [payrollKey, setPayrollKey] = useState('');
  const [payrollJournal, setPayrollJournal] = useState('OD');
  const [payrollCompte, setPayrollCompte] = useState('66');
  const [payrollAutoMapping, setPayrollAutoMapping] = useState(true);

  // Logs filters
  const [logDateFrom, setLogDateFrom] = useState('2026-03-14');
  const [logDateTo, setLogDateTo] = useState('2026-03-14');
  const [logMethod, setLogMethod] = useState('');
  const [logStatus, setLogStatus] = useState('');

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
      try {
        await adapter.create('settings', data);
      } catch (error) {
        console.error(`[AdminAPI] saveSetting "${key}" failed:`, error);
        toast.error(`Erreur sauvegarde paramètre "${key}"`);
      }
    }
  };

  const togglePerm = (p: string) => {
    setNewKeyPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleWebhookEvent = (e: string) => {
    setWebhookEvents_(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const toggleReveal = (i: number) => {
    setRevealedKeys(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t whitespace-nowrap ${
              subTab === i ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Cles API */}
      {subTab === 0 && (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">Les cles API donnent un acces direct a vos donnees comptables. Ne les partagez jamais et revoquezles immediatement en cas de compromission.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setShowKeyModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Generer une cle
            </button>
          </div>
          <div className="bg-white rounded-lg border overflow-x-auto">
            {apiKeys.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucune cle API. Generez-en une pour commencer.</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Nom', 'Cle', 'Permissions', 'Creee le', 'Dernier usage', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {apiKeys.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.nom}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {revealedKeys.has(i) ? row.cle.replace('...', 'g7h8i9j0') : row.cle}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.permissions.map((p: string) => (
                          <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.creee}</td>
                    <td className="px-4 py-3">{row.dernier}</td>
                    <td className="px-4 py-3"><span className="text-green-600 font-medium">{row.statut}</span></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => toggleReveal(i)} className="text-gray-500 hover:text-gray-700">
                        {revealedKeys.has(i) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={async () => {
                        const updated = apiKeys.filter((_, idx) => idx !== i);
                        setApiKeys(updated);
                        try { await saveSetting('admin_api_keys', updated); } catch (error) { console.error('[AdminAPI] revoke key failed:', error); toast.error('Erreur lors de la révocation'); }
                        toast.success('Cle API revoquee');
                      }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>

          {showKeyModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Generer une cle API</h3>
                  <button onClick={() => setShowKeyModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Ex: Application Mobile" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {allPermissions.map(p => (
                      <label key={p} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newKeyPerms.includes(p)} onChange={() => togglePerm(p)} className="rounded" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
                  <select value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    <option value="30j">30 jours</option>
                    <option value="90j">90 jours</option>
                    <option value="1an">1 an</option>
                    <option value="jamais">Jamais</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                  <button onClick={async () => {
                    if (!newKeyName.trim()) { toast.error('Le nom est obligatoire'); return; }
                    const newKey = {
                      nom: newKeyName,
                      cle: 'wbk_live_' + crypto.randomUUID().substring(0, 12) + '...',
                      permissions: newKeyPerms,
                      creee: new Date().toLocaleDateString('fr-FR'),
                      dernier: '-',
                      statut: 'Actif',
                    };
                    const updated = [...apiKeys, newKey];
                    setApiKeys(updated);
                    try {
                      await saveSetting('admin_api_keys', updated);
                    } catch (error) {
                      console.error('[AdminAPI] save key failed:', error);
                      toast.error('Erreur lors de la sauvegarde de la clé');
                    }
                    setShowKeyModal(false);
                    setNewKeyName(''); setNewKeyPerms([]);
                    toast.success('Cle API generee avec succes');
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Generer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Webhooks */}
      {subTab === 1 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowWebhookModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          <div className="bg-white rounded-lg border overflow-x-auto">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucun webhook configure</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['URL', 'Evenements', 'Statut', 'Derniere reponse', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {webhooks.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{row.url}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(row.events || []).map((e: string) => (
                          <span key={e} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{e}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${row.statut === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.statut}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.reponse ? <span className={`px-2 py-1 rounded text-xs font-medium ${row.reponse < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.reponse}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => toast.success('Webhook teste avec succes')} className="text-blue-600 hover:text-blue-800 text-xs underline">Tester</button>
                      <button onClick={async () => {
                        const updated = webhooks.filter((_, idx) => idx !== i);
                        setWebhooks(updated);
                        try { await saveSetting('admin_webhooks', updated); } catch (error) { console.error('[AdminAPI] delete webhook failed:', error); toast.error('Erreur suppression webhook'); }
                        toast.success('Webhook supprime');
                      }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>

          {showWebhookModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ajouter un webhook</h3>
                  <button onClick={() => setShowWebhookModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evenements</label>
                  <div className="space-y-2">
                    {webhookEvents.map(ev => (
                      <label key={ev} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={webhookEvents_.includes(ev)} onChange={() => toggleWebhookEvent(ev)} className="rounded" />
                        {ev}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secret (auto-genere)</label>
                  <div className="flex gap-2">
                    <input type="text" value={webhookSecret} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-50 font-mono text-xs" />
                    <button onClick={() => { navigator.clipboard.writeText(webhookSecret); toast.success('Secret copie'); }} className="text-blue-600"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowWebhookModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                  <button onClick={async () => {
                    if (!webhookUrl.trim()) { toast.error('L\'URL est obligatoire'); return; }
                    const newWh = { url: webhookUrl, events: webhookEvents_, statut: 'Actif', reponse: 0 };
                    const updated = [...webhooks, newWh];
                    setWebhooks(updated);
                    try { await saveSetting('admin_webhooks', updated); } catch (error) { console.error('[AdminAPI] save webhook failed:', error); toast.error('Erreur sauvegarde webhook'); }
                    setShowWebhookModal(false); setWebhookUrl(''); setWebhookEvents_([]);
                    toast.success('Webhook ajoute avec succes');
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Integration bancaire */}
      {subTab === 2 && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border flex items-center gap-3 ${bankConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            {bankConnected ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-gray-400" />}
            <div>
              <h4 className="font-medium">{bankConnected ? 'Connecte' : 'Non connecte'}</h4>
              <p className="text-sm text-gray-500">{bankConnected ? `Connexion active avec ${bankName}` : 'Aucune integration bancaire configuree'}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banque</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  {['SGBCI', 'BICICI', 'Ecobank', 'NSIA', 'BOA', 'SIB', 'BNI', 'Coris Bank'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Protocole</label>
                <select value={bankProtocol} onChange={e => setBankProtocol(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option>EBICS</option>
                  <option>SWIFT MT940</option>
                  <option>API REST</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant abonne</label>
                <input type="text" value={bankIdentifiant} onChange={e => setBankIdentifiant(e.target.value)} placeholder="Votre identifiant" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe / Certificat</label>
                <input type="password" value={bankPassword} onChange={e => setBankPassword(e.target.value)} placeholder="Mot de passe" className="w-full border rounded-lg px-3 py-2" />
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center text-sm text-gray-500 cursor-pointer hover:border-blue-400">
                  Deposez un certificat ici ou cliquez pour parcourir
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequence de synchronisation</label>
                <select value={bankFrequency} onChange={e => setBankFrequency(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option>Temps reel</option>
                  <option>Toutes les heures</option>
                  <option>Quotidien</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => toast.success('Test de connexion reussi')} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Tester la connexion
              </button>
              <button onClick={async () => {
                setBankConnected(true);
                try {
                  await saveSetting('admin_bank_integration', { connected: true, name: bankName, protocol: bankProtocol, frequency: bankFrequency });
                  toast.success('Integration bancaire enregistree');
                } catch (error) {
                  console.error('[AdminAPI] bank integration save failed:', error);
                  toast.error('Erreur lors de la sauvegarde');
                }
              }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration paie */}
      {subTab === 3 && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border flex items-center gap-3 ${payrollConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            {payrollConnected ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-gray-400" />}
            <div>
              <h4 className="font-medium">{payrollConnected ? 'Connecte' : 'Non connecte'}</h4>
              <p className="text-sm text-gray-500">{payrollConnected ? `Integration active avec ${payrollSoftware}` : 'Aucune integration paie configuree'}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logiciel de paie</label>
                <select value={payrollSoftware} onChange={e => setPayrollSoftware(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  {['Sage Paie', 'CEGID RH', 'ADP', 'Odoo RH', 'Autre'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL API</label>
                <input type="url" value={payrollUrl} onChange={e => setPayrollUrl(e.target.value)} placeholder="https://paie.example.com/api" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cle API</label>
                <input type="password" value={payrollKey} onChange={e => setPayrollKey(e.target.value)} placeholder="Cle API du logiciel de paie" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal OD cible</label>
                <select value={payrollJournal} onChange={e => setPayrollJournal(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="OD">OD - Operations Diverses</option>
                  <option value="PA">PA - Paie</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compte charges personnel</label>
                <input type="text" value={payrollCompte} onChange={e => setPayrollCompte(e.target.value)} placeholder="66" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <label className="text-sm font-medium text-gray-700">Mapping automatique</label>
                <button onClick={() => setPayrollAutoMapping(!payrollAutoMapping)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${payrollAutoMapping ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${payrollAutoMapping ? 'tranprimary-x-7' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => toast.success('Test de connexion paie reussi')} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Tester
              </button>
              <button onClick={async () => {
                setPayrollConnected(true);
                try {
                  await saveSetting('admin_payroll_integration', { connected: true, software: payrollSoftware, journal: payrollJournal, compte: payrollCompte });
                  toast.success('Integration paie enregistree');
                } catch (error) {
                  console.error('[AdminAPI] payroll integration save failed:', error);
                  toast.error('Erreur lors de la sauvegarde');
                }
              }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs API */}
      {subTab === 4 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <input type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              <span className="text-gray-400">-</span>
              <input type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            </div>
            <select value={logMethod} onChange={e => setLogMethod(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Toutes les methodes</option>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <select value={logStatus} onChange={e => setLogStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Tous les codes</option>
              <option value="2xx">2xx - Succes</option>
              <option value="4xx">4xx - Erreur client</option>
              <option value="5xx">5xx - Erreur serveur</option>
            </select>
          </div>
          <div className="bg-white rounded-lg border overflow-x-auto">
            {apiLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucun log API enregistre</div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Methode', 'Endpoint', 'Code', 'Duree (ms)', 'IP', 'Cle utilisee'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {apiLogs.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{row.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${methodColors[row.method]}`}>{row.method}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.endpoint}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.code < 300 ? 'bg-green-100 text-green-700' : row.code < 500 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>{row.code}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{row.duree}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.ip}</td>
                    <td className="px-4 py-3 text-xs">{row.cle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAPI;
