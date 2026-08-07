import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Download, Upload, Clock, Calendar, RotateCcw, FileDown,
  HardDrive, Shield, AlertTriangle, CheckCircle, XCircle, Settings,
  Trash2, RefreshCw, Database
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import type { TableName } from '@atlas/data';

interface Props {
  subTab: number;
  setSubTab: (n: number) => void;
}

// Clés (et non libellés) : les tables de ce module sont figées au chargement,
// la traduction doit être résolue au rendu.
const TAB_KEYS = [
  'adminBackup.tabBackup', 'adminBackup.tabAuto', 'adminBackup.tabHistory',
  'adminBackup.tabRestore', 'adminBackup.tabExport', 'adminBackup.tabReset',
];

// Tables sauvegardées en mode SaaS
const SAAS_TABLES: TableName[] = [
  'journalEntries', 'accounts', 'thirdParties', 'assets', 'fiscalYears',
  'budgetLines', 'settings', 'provisions', 'exchangeRates', 'closureSessions',
  'inventoryItems', 'stockMovements', 'revisionItems', 'aliasTiers', 'aliasPrefixConfig',
  'taxRegistry', 'taxDeclarations', 'paymentOrders', 'cashMovements',
  'loanSchedules', 'checks', 'recoveryCases',
];

const RESET_GROUPS = [
  { key: 'thirdParties', labelKey: 'adminBackup.grpThirdParties', descKey: 'adminBackup.grpThirdPartiesDesc', tables: ['thirdParties'] },
  { key: 'journalEntries', labelKey: 'adminBackup.grpEntries', descKey: 'adminBackup.grpEntriesDesc', tables: ['journalEntries'] },
  { key: 'assets', labelKey: 'adminBackup.grpAssets', descKey: 'adminBackup.grpAssetsDesc', tables: ['assets'] },
  { key: 'budgetLines', labelKey: 'adminBackup.grpBudgets', descKey: 'adminBackup.grpBudgetsDesc', tables: ['budgetLines'] },
  { key: 'treasury', labelKey: 'adminBackup.grpTreasury', descKey: 'adminBackup.grpTreasuryDesc', tables: ['hedgingPositions', 'paymentOrders', 'loanSchedules', 'checks'] },
  { key: 'all', labelKey: 'adminBackup.grpAll', descKey: 'adminBackup.grpAllDesc', tables: [
    'journalEntries', 'thirdParties', 'assets', 'budgetLines', 'hedgingPositions', 'paymentOrders',
    'loanSchedules', 'checks', 'recoveryCases', 'taxDeclarations', 'taxRegistry', 'provisions',
    'inventoryItems', 'stockMovements', 'revisionItems', 'closureSessions', 'exchangeRates',
    'fiscalPeriods', 'cashMovements', 'cashRegisterSessions',
  ]},
];

// `type` de l'historique : CODE persisté en base (français canonique), traduit
// à l'affichage seulement — les entrées déjà enregistrées restent lisibles.
const HISTORY_TYPE_KEY: Record<string, string> = {
  Manuel: 'adminBackup.typeManual',
  Auto: 'adminBackup.typeAuto',
  Restauration: 'adminBackup.typeRestore',
};

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
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  // Phrase de confirmation dérivée UNE seule fois de la traduction : l'affichage,
  // le placeholder et les comparaisons doivent rester strictement identiques,
  // sinon le garde-fou de l'action destructive casse dans les autres langues.
  const resetPhrase = t('adminBackup.resetPhrase');
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
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
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
    setBackupLabel(t('adminBackup.readingData'));
    const backup: Record<string, any> = {
      _meta: { date: new Date().toISOString(), version: '2.0', mode: 'saas' },
    };
    let totalSize = 0;
    for (let i = 0; i < SAAS_TABLES.length; i++) {
      const table = SAAS_TABLES[i];
      setBackupLabel(t('adminBackup.exportingTable', { table, index: String(i + 1), total: String(SAAS_TABLES.length) }));
      try { backup[table] = await adapter.getAll<any>(table); }
      catch { backup[table] = []; }
      setBackupProgress(Math.round(((i + 1) / SAAS_TABLES.length) * 90));
    }
    setBackupLabel(t('adminBackup.generatingFile'));
    const content = JSON.stringify(backup, null, 2);
    totalSize = content.length;
    const sizeMb = (totalSize / 1024 / 1024).toFixed(2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBlob(content, `atlas-backup-${dateStr}.json`);
    setBackupProgress(100);
    setBackupLabel(t('adminBackup.backupDone'));
    toast.success(t('adminBackup.backupExported', { size: sizeMb }));
    // `type` et `status` sont des CODES persistés dans l'historique : ils restent
    // canoniques en base, seul leur affichage est traduit.
    await addToHistory({ date: new Date().toLocaleString(dateLocale), type: 'Manuel', size: sizeMb + ' Mo', status: 'Succes' });
    setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 2000);
  };

  // ── LOCAL : sauvegarde Dexie (export RÉEL, fini la fausse barre de progression) ──
  const handleLocalBackup = async () => {
    setBackupProgress(0);
    setBackupLabel(t('adminBackup.readingData'));
    const backup: Record<string, any> = {
      _meta: { date: new Date().toISOString(), version: '2.0', mode: 'local' },
    };
    for (let i = 0; i < SAAS_TABLES.length; i++) {
      const table = SAAS_TABLES[i];
      setBackupLabel(t('adminBackup.exportingTable', { table, index: String(i + 1), total: String(SAAS_TABLES.length) }));
      try { backup[table] = await adapter.getAll<any>(table); }
      catch { backup[table] = []; }
      setBackupProgress(Math.round(((i + 1) / SAAS_TABLES.length) * 90));
    }
    setBackupLabel(t('adminBackup.generatingFile'));
    const content = JSON.stringify(backup, null, 2);
    const sizeMb = (content.length / 1024 / 1024).toFixed(2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBlob(content, `atlas-backup-local-${dateStr}.json`);
    setBackupProgress(100);
    setBackupLabel(t('adminBackup.backupDone'));
    toast.success(t('adminBackup.backupExported', { size: sizeMb }));
    await addToHistory({ date: new Date().toLocaleString(dateLocale), type: 'Manuel', size: sizeMb + ' Mo', status: 'Succes' });
    setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 2000);
  };

  // ── SAAS : restauration depuis fichier JSON ─────────────────────────────
  const handleSaasRestore = async () => {
    if (!restoreFile || !restoreAcknowledged) return;
    setShowRestoreConfirm(false);
    setBackupProgress(0);
    setBackupLabel(t('adminBackup.readingFile'));
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      if (!backup._meta) { toast.error(t('adminBackup.invalidBackupFile')); return; }
      const tables = Object.keys(backup).filter(k => k !== '_meta') as TableName[];
      const tenantId = (adapter as any).tenantId;
      let okCount = 0, errCount = 0;
      const failedTables: string[] = [];
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const rows = backup[table];
        setBackupLabel(t('adminBackup.restoringTable', { table, index: String(i + 1), total: String(tables.length) }));
        setBackupProgress(Math.round(((i + 1) / tables.length) * 90));
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // Upsert via Supabase directement (les tables ont id ou key comme PK)
        const pgTable = (adapter as any).pgTable?.(table) || table;
        const pkCol = table === 'settings' ? 'key' : 'id';
        // SECURITE : forcer le tenant courant sur chaque ligne portant un tenant_id,
        // pour empêcher toute injection cross-tenant depuis un fichier manipulé.
        const scoped = tenantId
          ? rows.map((r: any) => (r && typeof r === 'object' && 'tenant_id' in r ? { ...r, tenant_id: tenantId } : r))
          : rows;
        try {
          const { error } = await (supabase as any).from(pgTable).upsert(scoped, { onConflict: pkCol, ignoreDuplicates: false });
          if (error) { console.error(`[Restore] ${table}:`, error.message); errCount++; failedTables.push(table); }
          else okCount++;
        } catch (e) { errCount++; failedTables.push(table); }
      }
      setBackupProgress(100);
      // Statut réel (pas de "succès" systématique) : Succès / Partiel / Échec
      const status = errCount === 0 ? 'Succes' : okCount === 0 ? 'Echec' : 'Partiel';
      if (errCount === 0) {
        setBackupLabel(t('adminBackup.restoreDone'));
        toast.success(t('adminBackup.restoreSuccess'));
      } else if (okCount === 0) {
        setBackupLabel(t('adminBackup.restoreFailed'));
        toast.error(t('adminBackup.restoreFailedNone', { tables: failedTables.join(', ') }));
      } else {
        setBackupLabel(t('adminBackup.restorePartialLabel', { count: String(errCount) }));
        toast.warning(t('adminBackup.restorePartialToast', { ok: String(okCount), failed: String(errCount), tables: failedTables.join(', ') }));
      }
      await addToHistory({ date: new Date().toLocaleString(dateLocale), type: 'Restauration', size: (restoreFile.size / 1024).toFixed(0) + ' Ko', status });
      setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 2000);
    } catch (err) {
      toast.error(t('adminBackup.restoreError', { message: String(err) }));
      setBackupProgress(null);
    } finally {
      setRestoreFile(null);
      setRestoreAcknowledged(false);
    }
  };

  // ── EXPORT JSON / FEC / CSV ─────────────────────────────────────────────
  const handleExport = async () => {
    setBackupProgress(0);
    setBackupLabel(t('adminBackup.exportInProgress'));
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
      toast.success(t('adminBackup.exportGenerated', { format: exportFormat }));
      setTimeout(() => { setBackupProgress(null); setBackupLabel(''); }, 1500);
    } catch (err) {
      toast.error(t('adminBackup.exportError'));
      setBackupProgress(null);
    }
  };

  const handleReset = async () => {
    // Étape 1 : phrase de confirmation (comparée à la phrase traduite courante)
    if (resetInput.trim().toLowerCase() !== resetPhrase.toLowerCase()) {
      toast.error(t('adminBackup.typeExactPhrase', { phrase: resetPhrase }));
      return;
    }
    // Étape 2 : vérification du mot de passe via Supabase Auth
    setResetPasswordError('');
    if (!resetPassword) { setResetPasswordError(t('adminBackup.passwordRequired')); return; }
    try {
      const { data: { session } } = await (supabase as any).auth.getSession();
      if (!session?.user?.email) { setResetPasswordError(t('adminBackup.sessionExpired')); return; }
      // Re-authentifier pour confirmer le mot de passe
      const { error: authErr } = await (supabase as any).auth.signInWithPassword({
        email: session.user.email,
        password: resetPassword,
      });
      if (authErr) { setResetPasswordError(t('adminBackup.passwordIncorrect')); return; }
    } catch { setResetPasswordError(t('adminBackup.verificationError')); return; }
    const group = RESET_GROUPS.find(g => g.key === resetTarget);
    if (!group) return;
    setResetLoading(true);
    try {
      if (isSaas) {
        // ── Mode SaaS : supprimer via Supabase directement ───────────────
        const sc = (adapter as any).client;
        const tid = (adapter as any).tenantId;
        if (!sc || !tid) throw new Error(t('adminBackup.supabaseNotInit'));

        // Mapping table JS → nom table Postgres
        // Mapping JS table name → { pgTable, tenantCol }
        // Les tables trésorerie (migration 14) utilisent company_id, pas tenant_id
        const pgMap: Record<string, { pg: string; col: string }> = {
          journalEntries:       { pg: 'journal_entries',        col: 'tenant_id' },
          thirdParties:         { pg: 'third_parties',          col: 'tenant_id' },
          assets:               { pg: 'assets',                 col: 'tenant_id' },
          budgetLines:          { pg: 'budget_lines',           col: 'tenant_id' },
          provisions:           { pg: 'provisions',             col: 'tenant_id' },
          inventoryItems:       { pg: 'inventory_items',        col: 'tenant_id' },
          stockMovements:       { pg: 'stock_movements',        col: 'tenant_id' },
          revisionItems:        { pg: 'revision_items',         col: 'tenant_id' },
          closureSessions:      { pg: 'closure_sessions',       col: 'tenant_id' },
          exchangeRates:        { pg: 'exchange_rates',         col: 'tenant_id' },
          recoveryCases:        { pg: 'recovery_cases',         col: 'tenant_id' },
          taxDeclarations:      { pg: 'tax_declarations',       col: 'tenant_id' },
          taxRegistry:          { pg: 'tax_registry',           col: 'tenant_id' },
          accounts:             { pg: 'accounts',               col: 'tenant_id' },
          fiscalYears:          { pg: 'fiscal_years',           col: 'tenant_id' },
          auditLogs:            { pg: 'audit_logs',             col: 'tenant_id' },
          settings:             { pg: 'settings',               col: 'tenant_id' },
          fiscalPeriods:        { pg: 'periodes_comptables',    col: 'tenant_id' },
          // Trésorerie — utilisent company_id (migration 14)
          paymentOrders:        { pg: 'payment_orders',         col: 'company_id' },
          cashRegisterSessions: { pg: 'cash_register_sessions', col: 'company_id' },
          cashMovements:        { pg: 'cash_movements',         col: 'company_id' },
          loanSchedules:        { pg: 'loan_schedules',         col: 'company_id' },
          checks:               { pg: 'checks_register',        col: 'company_id' },
          purchaseOrders:       { pg: 'purchase_orders',        col: 'company_id' },
          goodsReceipts:        { pg: 'goods_receipts',         col: 'company_id' },
          offBalanceCommitments:{ pg: 'off_balance_commitments',col: 'company_id' },
          hedgingPositions:     { pg: 'hedging_positions',      col: 'tenant_id' },
        };

        // journal_lines EN PREMIER (FK sur journal_entries)
        const tablesWithLines = group.key === 'all' || group.key === 'journalEntries';
        if (tablesWithLines) {
          const { error } = await sc.from('journal_lines').delete().eq('tenant_id', tid);
          if (error) console.error('[Reset SaaS] journal_lines:', error.message);
        }

        for (const table of group.tables) {
          const mapping = pgMap[table];
          if (!mapping) continue;
          const { error } = await sc.from(mapping.pg).delete().eq(mapping.col, tid);
          if (error) console.error(`[Reset SaaS] ${mapping.pg} (${mapping.col}):`, error.message);
        }
        // Vider aussi le cache local (IndexedDB + localStorage)
        try {
          const dbs = await indexedDB.databases?.() || [];
          for (const db of dbs) { if (db.name) indexedDB.deleteDatabase(db.name); }
        } catch { /* ignore si API non disponible */ }
      } else {
        // ── Mode local (Dexie) ────────────────────────────────────────────
        for (const table of group.tables) { await (db as any)[table]?.clear(); }
      }
      setResetSuccess(true); setResetTarget(null); setResetInput(''); setResetPassword(''); setResetPasswordError('');
      toast.success(t('adminBackup.resetDone'));
    } catch (err) {
      toast.error(t('adminBackup.resetError', { message: err instanceof Error ? err.message : String(err) }));
      console.error('[handleReset]', err);
    }
    finally { setResetLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-400">{t('adminBackup.loading')}</div>;

  const btnBlue = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm';

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0 overflow-x-auto">
        {TAB_KEYS.map((tabKey, i) => (
          <button key={tabKey} onClick={() => setSubTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t whitespace-nowrap border-b-2 transition-colors ${subTab === i ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t(tabKey)}
          </button>
        ))}
      </div>

      {/* Barre de progression globale */}
      {backupProgress !== null && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span>{backupLabel || t('adminBackup.inProgress')}</span>
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
            <h3 className="text-lg font-semibold">{t('adminBackup.fullBackup')}</h3>
            <p className="text-gray-500 text-center max-w-md">
              {t(isSaas ? 'adminBackup.fullBackupSaas' : 'adminBackup.fullBackupLocal')}
            </p>
            {backupProgress === null && (
              <button onClick={isSaas ? handleSaasBackup : handleLocalBackup} className={btnBlue + ' text-base px-6 py-3'}>
                <Download className="w-5 h-5" /> {t('adminBackup.startBackup')}
              </button>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> {t('adminBackup.lastBackup')}</h4>
            {lastBackup ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">{t('adminBackup.dateLabel')}</span> {lastBackup.date}</div>
                <div><span className="text-gray-500">{t('adminBackup.sizeLabel')}</span> {lastBackup.size}</div>
                <div><span className="text-gray-500">{t('adminBackup.statusLabel')}</span> <span className={`font-medium ${lastBackup.status === 'Succes' ? 'text-green-600' : 'text-red-600'}`}>{t(lastBackup.status === 'Succes' ? 'adminBackup.statusSuccess' : 'adminBackup.statusFailure')}</span></div>
              </div>
            ) : <p className="text-sm text-gray-400">{t('adminBackup.noBackup')}</p>}
          </div>
        </div>
      )}

      {/* ── AUTO ─────────────────────────────────────────────────────────── */}
      {subTab === 1 && (
        <div className="space-y-6 bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{t('adminBackup.autoBackup')}</h3>
              <p className="text-sm text-gray-500">{t('adminBackup.configurePeriodic')}</p>
            </div>
            <button onClick={() => setAutoEnabled(!autoEnabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${autoEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${autoEnabled ? 'translate-x-7' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('adminBackup.frequency')}</label>
              <select value={autoFrequency} onChange={e => setAutoFrequency(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="daily">{t('adminBackup.daily')}</option><option value="weekly">{t('adminBackup.weekly')}</option><option value="monthly">{t('adminBackup.monthly')}</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('adminBackup.time')}</label>
              <input type="time" value={autoTime} onChange={e => setAutoTime(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('adminBackup.retentionDays')}</label>
              <input type="number" value={retention} onChange={e => setRetention(Number(e.target.value))} min={1} className="w-full border rounded-lg px-3 py-2" /></div>
          </div>
          <button onClick={async () => { await saveSetting('admin_backup_auto', { enabled: autoEnabled, frequency: autoFrequency, time: autoTime, retention }); toast.success(t('adminBackup.settingsSaved')); }} className={btnBlue}>
            <Settings className="w-4 h-4" /> {t('adminBackup.save')}
          </button>
        </div>
      )}

      {/* ── HISTORIQUE ───────────────────────────────────────────────────── */}
      {subTab === 2 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {backupHistory.length === 0
            ? <div className="p-8 text-center text-gray-400">{t('adminBackup.noHistory')}</div>
            : <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>{['adminBackup.colDate', 'adminBackup.colType', 'adminBackup.colSize', 'adminBackup.colStatus'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{t(h)}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {backupHistory.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${row.type === 'Auto' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{t(HISTORY_TYPE_KEY[row.type] ?? 'adminBackup.typeManual')}</span></td>
                      <td className="px-4 py-3">{row.size}</td>
                      <td className="px-4 py-3">{row.status === 'Succes' ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> {t('adminBackup.statusSuccess')}</span> : <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> {t('adminBackup.statusFailure')}</span>}</td>
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
              <h4 className="font-semibold text-red-800">{t('adminBackup.irreversibleOp')}</h4>
              <p className="text-sm text-red-700">{t('adminBackup.restoreWarning')} {t('adminBackup.backupBeforeContinuing')}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminBackup.backupFileLabel')}</label>
              <input ref={restoreFileRef} type="file" accept=".json" className="hidden"
                onChange={e => setRestoreFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => restoreFileRef.current?.click()} className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2 text-gray-600 hover:text-blue-600 w-full justify-center">
                <Upload className="w-5 h-5" />
                {restoreFile ? restoreFile.name : t('adminBackup.chooseFile')}
              </button>
            </div>
            {restoreFile && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={restoreAcknowledged} onChange={e => setRestoreAcknowledged(e.target.checked)} className="rounded" />
                  {t('adminBackup.restoreAck')}
                </label>
                <button onClick={() => setShowRestoreConfirm(true)} disabled={!restoreAcknowledged}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> {t('adminBackup.restoreFromFile')}
                </button>
              </>
            )}
          </div>
          {showRestoreConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4 shadow-xl">
                <h3 className="text-lg font-semibold text-red-800">{t('adminBackup.confirmRestore')}</h3>
                <p className="text-sm text-gray-600">{t('adminBackup.restoreFrom')} <strong>{restoreFile?.name}</strong>. {t('adminBackup.existingDataReplaced')}</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowRestoreConfirm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('adminBackup.cancel')}</button>
                  <button onClick={handleSaasRestore} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> {t('adminBackup.confirmRestore')}
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
          <h3 className="font-semibold text-lg flex items-center gap-2"><FileDown className="w-5 h-5" /> {t('adminBackup.dataExport')}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminBackup.exportFormat')}</label>
            <div className="flex flex-wrap gap-4">
              {['JSON', 'CSV', 'FEC'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="exportFormat" value={f} checked={exportFormat === f} onChange={() => setExportFormat(f)} />
                  <span className="text-sm font-medium">{f}</span>
                  {f === 'FEC' && <span className="text-xs text-gray-400">{t('adminBackup.fecFull')}</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('adminBackup.startDate')}</label>
              <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('adminBackup.endDate')}</label>
              <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
          </div>
          {backupProgress === null && (
            <button onClick={handleExport} className={btnBlue}>
              <FileDown className="w-4 h-4" /> {t('adminBackup.generateExport', { format: exportFormat })}
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
              <h4 className="font-semibold text-red-800">{t('adminBackup.resetZone')}</h4>
              <p className="text-sm text-red-700 mt-1">
                {t(isSaas ? 'adminBackup.resetWarningSaas' : 'adminBackup.resetWarningLocal')}
              </p>
            </div>
          </div>
          {resetSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">{t('adminBackup.resetPerformed')}</span>
              <button onClick={() => window.location.reload()} className="ml-auto px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> {t('adminBackup.reload')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RESET_GROUPS.filter(g => g.key !== 'all').map(group => (
              <div key={group.key} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-3">
                <div><p className="font-medium text-gray-800 text-sm">{t(group.labelKey)}</p><p className="text-xs text-gray-500 mt-0.5">{t(group.descKey)}</p></div>
                <button onClick={() => { setResetTarget(group.key); setResetInput(''); setResetSuccess(false); }}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                  <Trash2 className="w-4 h-4" /> {t('adminBackup.clear')}
                </button>
              </div>
            ))}
          </div>
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-5 flex items-center justify-between gap-4">
            <div><p className="font-bold text-red-800">{t('adminBackup.grpAll')}</p><p className="text-sm text-red-700 mt-1">{t('adminBackup.resetAllDesc')}</p></div>
            <button onClick={() => { setResetTarget('all'); setResetInput(''); setResetSuccess(false); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 whitespace-nowrap flex-shrink-0">
              <AlertTriangle className="w-4 h-4" /> {t('adminBackup.eraseAll')}
            </button>
          </div>
          {resetTarget && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-5 shadow-2xl">
                {/* Titre */}
                <div className="flex items-center gap-3 pb-2 border-b border-red-100">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-800">{t(RESET_GROUPS.find(g => g.key === resetTarget)?.labelKey ?? '')}</h3>
                    <p className="text-xs text-red-600">{t('adminBackup.irreversibleAction')}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{t(RESET_GROUPS.find(g => g.key === resetTarget)?.descKey ?? '')}</p>
                </div>

                {/* Étape 1 — phrase */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{t('adminBackup.step1')}</span>
                    {t('adminBackup.typeExactly')} <span className="font-mono text-red-700">{resetPhrase}</span>
                  </label>
                  <input
                    type="text"
                    value={resetInput}
                    onChange={e => setResetInput(e.target.value)}
                    placeholder={resetPhrase}
                    autoFocus
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${
                      resetInput && resetInput.toLowerCase() !== resetPhrase.toLowerCase() ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {resetInput && resetInput.toLowerCase() === resetPhrase.toLowerCase() && (
                    <p className="text-xs text-green-600 mt-1">{t('adminBackup.phraseConfirmed')}</p>
                  )}
                </div>

                {/* Étape 2 — mot de passe */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{t('adminBackup.step2')}</span>
                    {t('adminBackup.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={e => { setResetPassword(e.target.value); setResetPasswordError(''); }}
                    placeholder={t('adminBackup.yourPassword')}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${
                      resetPasswordError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {resetPasswordError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{resetPasswordError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-1">
                  <button
                    onClick={() => { setResetTarget(null); setResetInput(''); setResetPassword(''); setResetPasswordError(''); }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                  >
                    {t('adminBackup.cancel')}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={
                      resetLoading ||
                      resetInput.toLowerCase() !== resetPhrase.toLowerCase() ||
                      !resetPassword
                    }
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                  >
                    {resetLoading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t('adminBackup.resetting')}</>
                      : <><Trash2 className="w-4 h-4" /> {t('adminBackup.resetDefinitively')}</>
                    }
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
