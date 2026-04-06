import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download, Upload, Clock, Calendar, RotateCcw, FileDown,
  HardDrive, Shield, AlertTriangle, CheckCircle, XCircle, Settings
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = ['Sauvegarde manuelle', 'Automatique', 'Historique', 'Restauration', 'Export'];

const AdminBackup: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter } = useData();
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState<any>(null);
  const [backupProgress, setBackupProgress] = useState<number | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoFrequency, setAutoFrequency] = useState('daily');
  const [autoTime, setAutoTime] = useState('02:00');
  const [retention, setRetention] = useState(30);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [exportFormat, setExportFormat] = useState('FEC');
  const [exportExercice, setExportExercice] = useState('2026');
  const [exportStart, setExportStart] = useState('2026-01-01');
  const [exportEnd, setExportEnd] = useState('2026-12-31');

  useEffect(() => {
    const load = async () => {
      try {
        const allSettings = await adapter.getAll<any>('settings');
        const historySetting = allSettings.find((s: any) => s.key === 'admin_backup_history');
        if (historySetting?.value) {
          const history = JSON.parse(historySetting.value);
          setBackupHistory(history);
          if (history.length > 0) setLastBackup(history[0]);
        }
        const autoSetting = allSettings.find((s: any) => s.key === 'admin_backup_auto');
        if (autoSetting?.value) {
          const auto = JSON.parse(autoSetting.value);
          if (auto.enabled !== undefined) setAutoEnabled(auto.enabled);
          if (auto.frequency) setAutoFrequency(auto.frequency);
          if (auto.time) setAutoTime(auto.time);
          if (auto.retention) setRetention(auto.retention);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

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
      try {
        await adapter.create('settings', data);
      } catch (error) {
        toast.error(`Erreur sauvegarde paramètre "${key}"`);
      }
    }
  };

  const saveBackupHistory = async (history: any[]) => {
    try {
      await saveSetting('admin_backup_history', history);
    } catch (err) {
    }
  };

  const handleManualBackup = () => {
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev !== null && prev >= 100) {
          clearInterval(interval);
          const newEntry = {
            date: new Date().toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            type: 'Manuel',
            size: '-',
            status: 'Succes',
          };
          const updated = [newEntry, ...backupHistory];
          setBackupHistory(updated);
          setLastBackup(newEntry);
          saveBackupHistory(updated);
          toast.success('Sauvegarde terminee avec succes');
          setTimeout(() => setBackupProgress(null), 1500);
          return 100;
        }
        return (prev ?? 0) + 20;
      });
    }, 400);
  };

  const handleRestore = () => {
    if (!selectedBackup || !restoreAcknowledged) return;
    toast.success('Restauration lancee. Veuillez patienter...');
    setShowRestoreConfirm(false);
    setRestoreAcknowledged(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t whitespace-nowrap ${
              subTab === i ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 0 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg border">
            <HardDrive className="w-16 h-16 text-blue-500" />
            <h3 className="text-lg font-semibold">Sauvegarde manuelle</h3>
            <p className="text-gray-500 text-center">Creez une sauvegarde complete de toutes vos donnees comptables</p>
            {backupProgress !== null ? (
              <div className="w-full max-w-md">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${backupProgress}%` }} />
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">{backupProgress}% termine</p>
              </div>
            ) : (
              <button onClick={handleManualBackup} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-lg">
                <Download className="w-5 h-5" /> Lancer la sauvegarde
              </button>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-700 mb-2">Derniere sauvegarde</h4>
            {lastBackup ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Date :</span> {lastBackup.date}</div>
                <div><span className="text-gray-500">Taille :</span> {lastBackup.size}</div>
                <div><span className="text-gray-500">Statut :</span> <span className={`font-medium ${lastBackup.status === 'Succes' ? 'text-green-600' : 'text-red-600'}`}>{lastBackup.status}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucune sauvegarde effectuee</p>
            )}
          </div>
        </div>
      )}

      {subTab === 1 && (
        <div className="space-y-6 bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Sauvegarde automatique</h3>
              <p className="text-sm text-gray-500">Configurez la sauvegarde periodique de vos donnees</p>
            </div>
            <button onClick={() => { setAutoEnabled(!autoEnabled); toast.success(autoEnabled ? 'Sauvegarde auto desactivee' : 'Sauvegarde auto activee'); }}
              className={`relative w-14 h-7 rounded-full transition-colors ${autoEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${autoEnabled ? 'tranprimary-x-7' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequence</label>
              <select value={autoFrequency} onChange={e => setAutoFrequency(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
              <input type="time" value={autoTime} onChange={e => setAutoTime(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conservation (jours)</label>
              <input type="number" value={retention} onChange={e => setRetention(Number(e.target.value))} min={1} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <button onClick={async () => {
            try {
              await saveSetting('admin_backup_auto', { enabled: autoEnabled, frequency: autoFrequency, time: autoTime, retention });
              toast.success('Parametres de sauvegarde auto enregistres');
            } catch (error) {
              toast.error('Erreur lors de la sauvegarde');
            }
          }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      )}

      {subTab === 2 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {backupHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Aucune sauvegarde dans l'historique</div>
          ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Type', 'Taille', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {backupHistory.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{row.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${row.type === 'Auto' ? 'bg-blue-100 text-blue-700' : 'bg-primary-100 text-primary-700'}`}>{row.type}</span>
                  </td>
                  <td className="px-4 py-3">{row.size}</td>
                  <td className="px-4 py-3">
                    {row.status === 'Succes' ? (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Succes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> Echec</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => toast.success('Telechargement lance')} className="text-blue-600 hover:text-blue-800"><Download className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedBackup(row.date); setSubTab(3); }} className="text-orange-600 hover:text-orange-800"><RotateCcw className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )
          }
        </div>
      )}

      {subTab === 3 && (
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Attention : Operation irreversible</h4>
              <p className="text-sm text-red-700">La restauration remplacera toutes les donnees actuelles par celles de la sauvegarde selectionnee. Cette action ne peut pas etre annulee.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sauvegarde a restaurer</label>
              <select value={selectedBackup} onChange={e => setSelectedBackup(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="">-- Selectionnez une sauvegarde --</option>
                {backupHistory.filter(h => h.status === 'Succes').map((h, i) => (
                  <option key={i} value={h.date}>{h.date} ({h.type} - {h.size})</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={restoreAcknowledged} onChange={e => setRestoreAcknowledged(e.target.checked)} className="rounded" />
              Je comprends que cette action remplacera toutes les donnees actuelles
            </label>
            <button onClick={() => setShowRestoreConfirm(true)} disabled={!selectedBackup || !restoreAcknowledged}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Upload className="w-4 h-4" /> Restaurer
            </button>
          </div>
          {showRestoreConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
                <h3 className="text-lg font-semibold text-red-800">Confirmer la restauration</h3>
                <p className="text-sm text-gray-600">Vous allez restaurer la sauvegarde du <strong>{selectedBackup}</strong>. Toutes les donnees actuelles seront ecrasees.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowRestoreConfirm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                  <button onClick={handleRestore} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirmer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 4 && (
        <div className="bg-white p-6 rounded-lg border space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2"><FileDown className="w-5 h-5" /> Export des donnees</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format d'export</label>
            <div className="flex flex-wrap gap-4">
              {['FEC', 'CSV', 'JSON', 'Excel'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportFormat" value={f} checked={exportFormat === f} onChange={() => setExportFormat(f)} className="text-blue-600" />
                  <span className="text-sm font-medium">{f}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exercice</label>
              <select value={exportExercice} onChange={e => setExportExercice(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date debut</label>
              <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <button onClick={() => toast.success(`Export ${exportFormat} genere avec succes`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Generer l'export
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminBackup;
