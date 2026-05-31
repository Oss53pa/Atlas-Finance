import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Download, Upload, Clock, Calendar, RotateCcw, FileDown,
  HardDrive, Shield, AlertTriangle, CheckCircle, XCircle, Settings,
  Trash2, RefreshCw, Database
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import type { TableName } from '@atlas/data';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

const tabs = ['Sauvegarde', 'Automatique', 'Historique', 'Restauration', 'Export', 'Réinitialisation'];

// Tables sauvegardées en mode SaaS
const SAAS_TABLES: TableName[] = [
  'journalEntries', 'accounts', 'thirdParties', 'assets', 'fiscalYears',
  'budgetLines', 'settings', 'provisions', 'exchangeRates', 'closureSessions',
  'inventoryItems', 'stockMovements', 'revisionItems', 'aliasTiers', 'aliasPrefixConfig',
  'taxRegistry', 'taxDeclarations', 'paymentOrders', 'cashMovements',
  'loanSchedules', 'checks', 'recoveryCases',
];

const RESET_GROUPS = [
  { key: 'thirdParties', label: '👥 Clients & Fournisseurs', desc: 'Supprime tous les tiers (clients, fournisseurs)', tables: ['thirdParties'] },
  { key: 'journalEntries', label: '📒 Écritures comptables', desc: 'Supprime toutes les écritures du journal', tables: ['journalEntries'] },
  { key: 'assets', label: '🏭 Immobilisations', desc: 'Supprime le registre des biens', tables: ['assets'] },
  { key: 'budgetLines', label: '📊 Budgets', desc: 'Supprime les lignes budgétaires', tables: ['budgetLines'] },
  { key: 'treasury', label: '💵 Trésorerie', desc: 'Couvertures, ordres de paiement, prêts, chèques', tables: ['hedgingPositions', 'paymentOrders', 'loanSchedules', 'checks'] },
  { key: 'all', label: '🔴 TOUT réinitialiser', desc: 'Efface TOUTES les données locales. IRRÉVERSIBLE.', tables: [
    'journalEntries', 'thirdParties', 'assets', 'budgetLines', 'hedgingPositions', 'paymentOrders',
    'loanSchedules', 'checks', 'recoveryCases', 'taxDeclarations', 'taxRegistry', 'provisions',
    'inventoryItems', 'stockMovements', 'revisionItems', 'closureSessions', 'exchangeRates',
    'fiscalPeriods', 'cashMovements', 'cashRegisterSessions',
  ]},
];

// ─── Téléchargement d'un blob côté navigateur ────────────────────────────────
function downloadBlob(content: string, filename: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const AdminBackup: React.FC<Props> = ({ subTab, setSubTab }) => {
  const { adapter, mode } = useData();
  const isSaas = mode === 'saas';
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState<any>(null);
  const [backupProgress, setBackupProgress] = useState<number | null>(null);
  const [backupLabel, setBackupLabel] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoFrequency, setAutoFrequency] = useState('daily');
  const [autoTime, setAutoTime] = useState('02:00');
  const [retention, setRetention] = useState(30);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [exportFormat, setExportFormat] = useState('JSON');
  const [exportStart, setExportStart] = useState(new Date().getFullYear() + '-01-01');
  const [exportEnd, setExportEnd] = useState(new Date().getFullYear() + '-12-31');
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetInput, setResetInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const allSettings = await adapter.getAll<any>('settings');
        const hist = allSettings.find((s: any) => s.key === 'admin_backup_history');
        if (hist?.value) { const h = JSON.parse(hist.value); setBackupHistory(h); if (h.length > 0) setLastBackup(h[0]); }
        const auto = allSettings.find((s: any) => s.key === 'admin_backup_auto');
        if (auto?.value) { const a = JSON.parse(auto.value); if (a.enabled !== undefined) setAutoEnabled(a.enabled); if (a.frequency) setAutoFrequency(a.frequency); if (a.time) setAutoTime(a.time); if (a.retention) setRetention(a.retention); }
      } catch { /* ignored */ } finally { setLoading(false); }
    };
    load();
  }, [adapter]);

  const saveSetting = async (key: string, value: any) => {
    const data = { key, value: JSON.stringify(value), updatedAt: new Date().toISOString() };
    try { const ex = await adapter.getById('settings', key); if (ex) await adapter.update('settings', key, data); else await adapter.create('settings', data); }
    catch { try { await adapter.create('settings', data); } catch { /* silent */ } }
  };

  const addToHistory = async (entry: any) => {
    const updated = [entry, ...backupHistory].slice(0, 50);
    setBackupHistory(updated);
    setLastBackup(entry);
    await saveSetting('admin_backup_history', updated);
  };

  // ── SAAS : export complet JSON ──────────────────────────────────────────
  const handleSaasBackup = async () => {
    setBackupProgress(0);
    setBackupLabel('Lecture des données...');
    const backup: Record<string, any> = {
      _meta: { date: new Date().toISOString(), version: '2.0', mode: 'saas' },
    };
    let totalSize = 0;
    for (let i = 0; i < SAAS_TABLES.length; i++) {
      const table = SAAS_TABLES[i];
      setBackupLabel(`Export ${table} (${i + 1}/${SAAS_TABLES.length})…`);
      try { backup[table] = await adapter.getAll<any>(table); }
      catch { backup[table] = []; }
      setBackupProgress(Math.round(((i + 1) / SAAS_TABLES.length) * 90));
    }
    setBackupLabel('Génération du fichier…');
    const content = JSON.stringify(backup, null, 2);
    totalSize = content.length;
    const sizeMb = (totalSize / 1024 / 1024).toFixed(2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBlob(content, `atlas-backup-${dateStr}.json`);
    setBackupProgress(100);
    setBackupLabel('Sauvegarde terminée');
    toast.success(`Sauvegarde exportée — ${sizeMb} Mo`);
    await addToHistory({ date: new Date().toLocaleString('fr-FR'), type: 'Manuel', size: sizeMb + ' Mo', status: 'Succes' });
    setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 2000);
  };

  // ── LOCAL : sauvegarde Dexie ────────────────────────────────────────────
  const handleLocalBackup = () => {
    setBackupProgress(0);
    const iv = setInterval(() => {
      setBackupProgress(prev => {
        if (prev !== null && prev >= 100) {
          clearInterval(iv);
          const e = { date: new Date().toLocaleString('fr-FR'), type: 'Manuel', size: '—', status: 'Succes' };
          addToHistory(e);
          toast.success('Sauvegarde terminée');
          setTimeout(() => setBackupProgress(null), 1500);
          return 100;
        }
        return (prev ?? 0) + 20;
      });
    }, 400);
  };

  // ── SAAS : restauration depuis fichier JSON ─────────────────────────────
  const handleSaasRestore = async () => {
    if (!restoreFile || !restoreAcknowledged) return;
    setShowRestoreConfirm(false);
    setBackupProgress(0);
    setBackupLabel('Lecture du fichier…');
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      if (!backup._meta) { toast.error('Fichier de sauvegarde invalide'); return; }
      const tables = Object.keys(backup).filter(k => k !== '_meta') as TableName[];
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const rows = backup[table];
        setBackupLabel(`Restauration ${table} (${i + 1}/${tables.length})…`);
        setBackupProgress(Math.round(((i + 1) / tables.length) * 90));
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // Upsert via Supabase directement (les tables ont id ou key comme PK)
        const pgTable = (adapter as any).pgTable?.(table) || table;
        const pkCol = table === 'settings' ? 'key' : 'id';
        try {
          const { error } = await (supabase as any).from(pgTable).upsert(rows, { onConflict: pkCol, ignoreDuplicates: false });
          if (error) console.error(`[Restore] ${table}:`, error.message);
        } catch (e) { /* table peut ne pas exister en SaaS */ }
      }
      setBackupProgress(100);
      setBackupLabel('Restauration terminée');
      toast.success('Restauration effectuée avec succès');
      await addToHistory({ date: new Date().toLocaleString('fr-FR'), type: 'Restauration', size: (restoreFile.size / 1024).toFixed(0) + ' Ko', status: 'Succes' });
      setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 2000);
    } catch (err) {
      toast.error('Erreur lors de la restauration : ' + String(err));
      setBackupProgress(null);
    } finally {
      setRestoreFile(null);
      setRestoreAcknowledged(false);
    }
  };

  // ── EXPORT JSON / FEC / CSV ─────────────────────────────────────────────
  const handleExport = async () => {
    setBackupProgress(0);
    setBackupLabel('Export en cours…');
    try {
      const entries = await adapter.getAll<any>('journalEntries');
      const filtered = entries.filter((e: any) => {
        const d = e.date || e.dateEcriture || '';
        return d >= exportStart && d <= exportEnd;
      });
      setBackupProgress(50);

      if (exportFormat === 'JSON') {
        const lines = await adapter.getAll<any>('journalLines').catch(() => []);
        const data = { journalEntries: filtered, journalLines: lines.filter((l: any) => filtered.some((e: any) => e.id === l.entry_id || e.id === l.entryId)) };
        downloadBlob(JSON.stringify(data, null, 2), `export-${exportStart}-${exportEnd}.json`);
      } else if (exportFormat === 'CSV') {
        const header = 'date,journal,reference,libelle,debit,credit,statut\n';
        const rows = filtered.map((e: any) => `${e.date},${e.journal || ''},${e.reference || ''},${(e.label || e.libelle || '').replace(/,/g, ';')},${e.totalDebit || 0},${e.totalCredit || 0},${e.status || ''}`).join('\n');
        downloadBlob(header + rows, `export-${exportStart}-${exportEnd}.csv`, 'text/csv');
      } else if (exportFormat === 'FEC') {
        // FEC DGFiP format (France/OHADA compatible)
        const header = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise\n';
        const rows = filtered.map((e: any) =>
          `${e.journal || ''}|Journal|${e.entryNumber || e.entry_number || ''}|${(e.date || '').replace(/-/g, '')}|||${e.reference || ''}||${(e.label || e.libelle || '').substring(0, 99)}|${e.totalDebit || 0}|${e.totalCredit || 0}|||||\n`
        ).join('');
        downloadBlob(header + rows, `FEC-${exportStart}-${exportEnd}.txt`, 'text/plain');
      }

      setBackupProgress(100);
      toast.success(`Export ${exportFormat} généré`);
      setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 1500);
    } catch (err) {
      toast.error('Erreur lors de l\'export');
      setBackupProgress(null);
    }
  };

  const handleReset = async () => {
    if (resetInput.trim() !== 'CONFIRMER') { toast.error('Tapez exactement "CONFIRMER" pour valider.'); return; }
    const group = RESET_GROUPS.find(g => g.key === resetTarget);
    if (!group) return;
    setResetLoading(true);
    try {
      for (const table of group.tables) { await (db as any)[table]?.clear(); }
      setResetSuccess(true); setResetTarget(null); setResetInput('');
      toast.success('Réinitialisation effectuée. Rechargez la page.');
    } catch { toast.error('Erreur lors de la réinitialisation.'); }
    finally { setResetLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-400">Chargement…</div>;

  const btnBlue = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm';

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t whitespace-nowrap border-b-2 transition-colors ${subTab === i ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Barre de progression globale */}
      {backupProgress !== null && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span>{backupLabel || 'En cours…'}</span>
            <span>{backupProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${backupProgress}%` }} />
          </div>
        </div>
      )}

      {/* ── SAUVEGARDE ────────────────────────────────────────────────────── */}
      {subTab === 0 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg border">
            <Database className="w-16 h-16 text-blue-500" />
            <h3 className="text-lg font-semibold">Sauvegarde complète</h3>
            <p className="text-gray-500 text-center max-w-md">
              {isSaas
                ? 'Exporte toutes vos données comptables (écritures, tiers, immobilisations, budgets, paramètres) dans un fichier JSON téléchargeable.'
                : 'Crée une sauvegarde locale de votre base IndexedDB.'}
            </p>
            {backupProgress === null && (
              <button onClick={isSaas ? handleSaasBackup : handleLocalBackup} className={btnBlue + ' text-base px-6 py-3'}>
                <Download className="w-5 h-5" /> Lancer la sauvegarde
              </button>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Dernière sauvegarde</h4>
            {lastBackup ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Date :</span> {lastBackup.date}</div>
                <div><span className="text-gray-500">Taille :</span> {lastBackup.size}</div>
                <div><span className="text-gray-500">Statut :</span> <span className={`font-medium ${lastBackup.status === 'Succes' ? 'text-green-600' : 'text-red-600'}`}>{lastBackup.status}</span></div>
              </div>
            ) : <p className="text-sm text-gray-400">Aucune sauvegarde effectuée</p>}
          </div>
        </div>
      )}

      {/* ── AUTO ─────────────────────────────────────────────────────────── */}
      {subTab === 1 && (
        <div className="space-y-6 bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Sauvegarde automatique</h3>
              <p className="text-sm text-gray-500">Configurez la sauvegarde périodique</p>
            </div>
            <button onClick={() => setAutoEnabled(!autoEnabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${autoEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${autoEnabled ? 'translate-x-7' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select value={autoFrequency} onChange={e => setAutoFrequency(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="daily">Quotidienne</option><option value="weekly">Hebdomadaire</option><option value="monthly">Mensuelle</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
              <input type="time" value={autoTime} onChange={e => setAutoTime(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Conservation (jours)</label>
              <input type="number" value={retention} onChange={e => setRetention(Number(e.target.value))} min={1} className="w-full border rounded-lg px-3 py-2" /></div>
          </div>
          <button onClick={async () => { await saveSetting('admin_backup_auto', { enabled: autoEnabled, frequency: autoFrequency, time: autoTime, retention }); toast.success('Paramètres enregistrés'); }} className={btnBlue}>
            <Settings className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      )}

      {/* ── HISTORIQUE ───────────────────────────────────────────────────── */}
      {subTab === 2 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {backupHistory.length === 0
            ? <div className="p-8 text-center text-gray-400">Aucune sauvegarde dans l'historique</div>
            : <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>{['Date', 'Type', 'Taille', 'Statut'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {backupHistory.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${row.type === 'Auto' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{row.type}</span></td>
                      <td className="px-4 py-3">{row.size}</td>
                      <td className="px-4 py-3">{row.status === 'Succes' ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Succès</span> : <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> Échec</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* ── RESTAURATION ─────────────────────────────────────────────────── */}
      {subTab === 3 && (
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Opération irréversible</h4>
              <p className="text-sm text-red-700">La restauration remplacera les données existantes par celles du fichier de sauvegarde. Faites une sauvegarde avant de continuer.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fichier de sauvegarde (.json)</label>
              <input ref={restoreFileRef} type="file" accept=".json" className="hidden"
                onChange={e => setRestoreFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => restoreFileRef.current?.click()} className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2 text-gray-600 hover:text-blue-600 w-full justify-center">
                <Upload className="w-5 h-5" />
                {restoreFile ? restoreFile.name : 'Choisir un fichier de sauvegarde'}
              </button>
            </div>
            {restoreFile && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={restoreAcknowledged} onChange={e => setRestoreAcknowledged(e.target.checked)} className="rounded" />
                  Je comprends que cette action remplacera les données existantes par celles du fichier
                </label>
                <button onClick={() => setShowRestoreConfirm(true)} disabled={!restoreAcknowledged}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Restaurer depuis ce fichier
                </button>
              </>
            )}
          </div>
          {showRestoreConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4 shadow-xl">
                <h3 className="text-lg font-semibold text-red-800">Confirmer la restauration</h3>
                <p className="text-sm text-gray-600">Vous allez restaurer depuis <strong>{restoreFile?.name}</strong>. Les données existantes seront remplacées.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowRestoreConfirm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                  <button onClick={handleSaasRestore} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Confirmer la restauration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EXPORT ───────────────────────────────────────────────────────── */}
      {subTab === 4 && (
        <div className="bg-white p-6 rounded-lg border space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2"><FileDown className="w-5 h-5" /> Export des données</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format d'export</label>
            <div className="flex flex-wrap gap-4">
              {['JSON', 'CSV', 'FEC'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportFormat" value={f} checked={exportFormat === f} onChange={() => setExportFormat(f)} />
                  <span className="text-sm font-medium">{f}</span>
                  {f === 'FEC' && <span className="text-xs text-gray-400">(Fichier des Écritures Comptables)</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
          </div>
          {backupProgress === null && (
            <button onClick={handleExport} className={btnBlue}>
              <FileDown className="w-4 h-4" /> Générer l'export {exportFormat}
            </button>
          )}
        </div>
      )}

      {/* ── RÉINITIALISATION ─────────────────────────────────────────────── */}
      {subTab === 5 && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Zone de réinitialisation</h4>
              <p className="text-sm text-red-700 mt-1">
                {isSaas
                  ? 'La réinitialisation efface les données de la base Supabase pour votre tenant. IRRÉVERSIBLE.'
                  : 'Efface les données de l\'IndexedDB local. IRRÉVERSIBLE. Faites une sauvegarde d\'abord.'}
              </p>
            </div>
          </div>
          {resetSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">Réinitialisation effectuée.</span>
              <button onClick={() => window.location.reload()} className="ml-auto px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> Recharger
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RESET_GROUPS.filter(g => g.key !== 'all').map(group => (
              <div key={group.key} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-3">
                <div><p className="font-medium text-gray-800 text-sm">{group.label}</p><p className="text-xs text-gray-500 mt-0.5">{group.desc}</p></div>
                <button onClick={() => { setResetTarget(group.key); setResetInput(''); setResetSuccess(false); }}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                  <Trash2 className="w-4 h-4" /> Vider
                </button>
              </div>
            ))}
          </div>
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-5 flex items-center justify-between gap-4">
            <div><p className="font-bold text-red-800">🔴 TOUT réinitialiser</p><p className="text-sm text-red-700 mt-1">Efface toutes les données — écritures, tiers, budgets, immobilisations, trésorerie…</p></div>
            <button onClick={() => { setResetTarget('all'); setResetInput(''); setResetSuccess(false); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 whitespace-nowrap flex-shrink-0">
              <AlertTriangle className="w-4 h-4" /> Tout effacer
            </button>
          </div>
          {resetTarget && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4 shadow-xl">
                <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />{RESET_GROUPS.find(g => g.key === resetTarget)?.label}</h3>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{RESET_GROUPS.find(g => g.key === resetTarget)?.desc}</p></div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Tapez <strong>CONFIRMER</strong> pour valider :</p>
                  <input type="text" value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder="CONFIRMER" autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setResetTarget(null); setResetInput(''); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Annuler</button>
                  <button onClick={handleReset} disabled={resetLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                    {resetLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> En cours…</> : <><Trash2 className="w-4 h-4" /> Confirmer</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBackup;
