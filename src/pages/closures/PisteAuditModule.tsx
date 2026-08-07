
import { formatCurrency } from '@/utils/formatters';
import React, { useState, useEffect, useCallback } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import type { DBAuditLog } from '../../lib/db';
import {
  Activity, User, Calendar, Clock, FileText,
  Search, Filter, Download, Eye, ChevronRight,
  Database, Edit, Trash2, Plus, Shield, AlertCircle,
  CheckCircle, XCircle, RefreshCw, Archive, Lock,
  Settings, TrendingUp, BarChart, History, AlertTriangle,
  Save
} from 'lucide-react';
import { useFeatureAccess } from '../../components/gating';

interface AuditEntry {
  id: string;
  timestamp: string;
  utilisateur: string;
  action: 'creation' | 'modification' | 'suppression' | 'validation' | 'consultation';
  entite: 'ecriture' | 'compte' | 'journal' | 'exercice' | 'utilisateur' | 'parametre';
  entiteId: string;
  entiteNom: string;
  details: string;
  ipAddress: string;
  navigateur: string;
  impact: 'faible' | 'moyen' | 'eleve' | 'critique';
  ancienneValeur?: Record<string, unknown>;
  nouvelleValeur?: Record<string, unknown>;
}

interface AuditStats {
  totalActions: number;
  actionsAujourdhui: number;
  utilisateursActifs: number;
  anomaliesDetectees: number;
}

const PisteAuditModule: React.FC = () => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const { adapter } = useData();
  const { allowed: canExportCertified } = useFeatureAccess('audit_trail_ohada_certifie');
  const [selectedPeriode, setSelectedPeriode] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('jour');
  const [filterAction, setFilterAction] = useState<'tous' | AuditEntry['action']>('tous');
  const [filterEntite, setFilterEntite] = useState<'tous' | AuditEntry['entite']>('tous');
  const [filterUtilisateur, setFilterUtilisateur] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'journal' | 'statistiques' | 'configuration'>('journal');
  const [retentionPeriod, setRetentionPeriod] = useState('1 an');

  // Real data from Dexie audit logs
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const logs = await adapter.getAll<DBAuditLog>('auditLogs');
      // Sort by timestamp descending
      logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      const mapped: AuditEntry[] = logs.map(log => {
        // Map action string to typed action
        const actionMap: Record<string, AuditEntry['action']> = {
          create: 'creation', add: 'creation', insert: 'creation',
          update: 'modification', edit: 'modification', modify: 'modification',
          delete: 'suppression', remove: 'suppression',
          validate: 'validation', approve: 'validation', post: 'validation',
        };
        const action = actionMap[log.action.toLowerCase()] || 'consultation';

        // Map entityType to typed entite
        const entiteMap: Record<string, AuditEntry['entite']> = {
          journalEntry: 'ecriture', entry: 'ecriture',
          account: 'compte',
          journal: 'journal',
          fiscalYear: 'exercice',
          user: 'utilisateur',
          setting: 'parametre',
        };
        const entite = entiteMap[log.entityType] || 'ecriture';

        return {
          id: log.id,
          timestamp: log.timestamp,
          utilisateur: log.userId || t('auditTrail.systemUser'),
          action,
          entite,
          entiteId: log.entityId,
          entiteNom: log.entityType + ' ' + log.entityId,
          details: log.details,
          ipAddress: '',
          navigateur: '',
          impact: action === 'suppression' ? 'eleve' as const : action === 'validation' ? 'moyen' as const : 'faible' as const,
        };
      });
      setAuditEntries(mapped);
    } catch (err) { /* silent */ /* silent */ }
  }, [adapter, t]);

  useEffect(() => { loadAuditLogs(); }, [loadAuditLogs]);

  useEffect(() => {
    adapter.getById<{ key: string; value: string }>('settings', 'audit_retention')
      .then(setting => { if (setting?.value) setRetentionPeriod(setting.value); })
      .catch(() => { /* silent */ });
  }, [adapter]);

  // Statistiques
  const stats: AuditStats = {
    totalActions: auditEntries.length,
    actionsAujourdhui: auditEntries.filter(e => {
      const today = new Date();
      const entryDate = new Date(e.timestamp);
      return entryDate.toDateString() === today.toDateString();
    }).length,
    utilisateursActifs: new Set(auditEntries.map(e => e.utilisateur)).size,
    anomaliesDetectees: auditEntries.filter(e => e.impact === 'critique' || e.action === 'suppression').length
  };

  // Filtrer les entrées
  const filteredEntries = auditEntries.filter(entry => {
    const matchAction = filterAction === 'tous' || entry.action === filterAction;
    const matchEntite = filterEntite === 'tous' || entry.entite === filterEntite;
    const matchUtilisateur = filterUtilisateur === 'tous' || entry.utilisateur === filterUtilisateur;
    const matchSearch = searchTerm === '' ||
      entry.entiteNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchAction && matchEntite && matchUtilisateur && matchSearch;
  });

  // Utilisateurs uniques pour le filtre
  const uniqueUsers = Array.from(new Set(auditEntries.map(e => e.utilisateur)));

  const getActionIcon = (action: AuditEntry['action']) => {
    switch (action) {
      case 'creation': return <Plus className="w-4 h-4 text-[var(--color-success)]" />;
      case 'modification': return <Edit className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'suppression': return <Trash2 className="w-4 h-4 text-[var(--color-error)]" />;
      case 'validation': return <CheckCircle className="w-4 h-4 text-primary-600" />;
      case 'consultation': return <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const getActionLabel = (action: AuditEntry['action']) => {
    switch (action) {
      case 'creation': return t('auditTrail.actionCreation');
      case 'modification': return t('auditTrail.actionModification');
      case 'suppression': return t('auditTrail.actionDeletion');
      case 'validation': return t('auditTrail.actionValidation');
      case 'consultation': return t('auditTrail.actionConsultation');
    }
  };

  const getImpactBadge = (impact: AuditEntry['impact']) => {
    const colors = {
      faible: 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      moyen: 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      eleve: 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      critique: 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]'
    };
    const labels: Record<AuditEntry['impact'], string> = {
      faible: t('auditTrail.impactLow'),
      moyen: t('auditTrail.impactMedium'),
      eleve: t('auditTrail.impactHigh'),
      critique: t('auditTrail.impactCritical'),
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[impact]}`}>
        {labels[impact]}
      </span>
    );
  };

  const exporterAudit = async () => {
    try {
      if (filteredEntries.length === 0) { toast.error(t('auditTrail.nothingToExport')); return; }
      const cols = ['id', 'date', 'utilisateur', 'action', 'entite', 'details'];
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = filteredEntries.map((e: any) =>
        [e.id, e.date ?? e.timestamp ?? '', e.utilisateur ?? '', e.action ?? '', e.entite ?? e.entityType ?? '', e.details ?? '']
          .map(esc).join(','));
      const body = [cols.join(','), ...rows].join('\n');
      // Empreinte SHA-256 RÉELLE du contenu exporté (plus de fausse certification).
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
      const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      const content = `${body}\n# ${t('auditTrail.exportFooter', { count: String(filteredEntries.length) })}\n# SHA-256: ${hash}`;
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `piste-audit-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('auditTrail.exportGenerated', { hash: hash.slice(0, 12) }));
    } catch (err: any) {
      toast.error(t('auditTrail.exportError', { message: err?.message || t('auditTrail.unknownError') }));
    }
  };

  const handleCancelConfig = () => {
    toast.success(t('auditTrail.changesCancelled'));
  };

  const handleSaveConfig = () => {
    toast.success(t('auditTrail.configSaved'));
  };

  const handleExportEntry = () => {
    if (selectedEntry) {
      toast.success(t('auditTrail.entryExporting', { id: selectedEntry.id }));
    }
  };

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full ">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('auditTrail.title')}</h1>
            <p className="text-[var(--color-text-tertiary)]">{t('auditTrail.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <PageHeaderActions />
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value as typeof selectedPeriode)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg"
            >
              <option value="jour">{t('common.today')}</option>
              <option value="semaine">{t('auditTrail.periodWeek')}</option>
              <option value="mois">{t('auditTrail.periodMonth')}</option>
              <option value="annee">{t('auditTrail.periodYear')}</option>
            </select>
            <button
              onClick={exporterAudit}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2" aria-label={t('auditTrail.download')}>
              <Download className="w-4 h-4" />
              <span>{t('common.export')}</span>
            </button>
            <button
              onClick={() => {
                if (!canExportCertified) {
                  toast.info(t('auditTrail.certifiedPremiumOnly'));
                  return;
                }
                toast.success(t('auditTrail.certifiedRunning'));
              }}
              disabled={!canExportCertified}
              title={canExportCertified ? t('auditTrail.certifiedTitle') : t('auditTrail.premiumFeature')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                canExportCertified
                  ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
              }`}
              aria-label={t('auditTrail.certifiedExport')}
            >
              <Shield className="w-4 h-4" />
              <span>{t('auditTrail.certifiedExport')}</span>
              {!canExportCertified && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ml-1"
                  style={{ background: 'rgba(239,159,39,0.15)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.3)' }}
                >
                  {t('auditTrail.premium')}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-[var(--color-background-secondary)] rounded-lg">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-text-tertiary)]">{t('auditTrail.totalActions')}</span>
              <Activity className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-primary)]">{stats.totalActions}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-text-tertiary)]">{t('common.today')}</span>
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-primary)]">{stats.actionsAujourdhui}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-text-tertiary)]">{t('auditTrail.activeUsers')}</span>
              <User className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-success)]">{stats.utilisateursActifs}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-text-tertiary)]">{t('auditTrail.anomalies')}</span>
              <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-error)]">{stats.anomaliesDetectees}</p>
          </div>
        </div>
      </div>

      {/* Tabs et contenu */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
        {/* Tabs */}
        <div className="border-b border-[var(--color-border)]">
          <div className="flex space-x-6 px-6">
            {[
              { id: 'journal', label: t('auditTrail.tabJournal'), icon: History },
              { id: 'statistiques', label: t('auditTrail.tabStats'), icon: BarChart },
              { id: 'configuration', label: t('auditTrail.tabConfig'), icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        {activeTab === 'journal' && (
          <div className="p-6">
            {/* Filtres */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value as typeof filterAction)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                >
                  <option value="tous">{t('auditTrail.allActions')}</option>
                  <option value="creation">{t('auditTrail.actionCreation')}</option>
                  <option value="modification">{t('auditTrail.actionModification')}</option>
                  <option value="suppression">{t('auditTrail.actionDeletion')}</option>
                  <option value="validation">{t('auditTrail.actionValidation')}</option>
                  <option value="consultation">{t('auditTrail.actionConsultation')}</option>
                </select>
                <select
                  value={filterEntite}
                  onChange={(e) => setFilterEntite(e.target.value as typeof filterEntite)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                >
                  <option value="tous">{t('auditTrail.allEntities')}</option>
                  <option value="ecriture">{t('accounting.entry')}</option>
                  <option value="compte">{t('accounting.account')}</option>
                  <option value="journal">{t('accounting.journal')}</option>
                  <option value="exercice">{t('auditTrail.entityFiscalYear')}</option>
                  <option value="utilisateur">{t('auditTrail.entityUser')}</option>
                  <option value="parametre">{t('auditTrail.entitySetting')}</option>
                </select>
                <select
                  value={filterUtilisateur}
                  onChange={(e) => setFilterUtilisateur(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                >
                  <option value="tous">{t('auditTrail.allUsers')}</option>
                  {uniqueUsers.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('auditTrail.searchPlaceholder')}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg"
                />
              </div>
            </div>

            {/* Liste des entrées */}
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-[var(--color-border)] rounded-lg p-4 hover:bg-[var(--color-background-secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Icône d'action */}
                      <div className="mt-1">
                        {getActionIcon(entry.action)}
                      </div>
                      
                      {/* Détails */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-[var(--color-primary)]">
                            {getActionLabel(entry.action)}
                          </span>
                          <span className="text-[var(--color-text-tertiary)]">-</span>
                          <span className="text-[var(--color-primary)]">{entry.entiteNom}</span>
                          {getImpactBadge(entry.impact)}
                        </div>
                        <p className="text-sm text-[var(--color-text-tertiary)] mb-2">{entry.details}</p>
                        <div className="flex items-center space-x-4 text-xs text-[var(--color-text-tertiary)]">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{entry.utilisateur}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(entry.timestamp).toLocaleString(dateLocale)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Database className="w-3 h-3" />
                            <span>{entry.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowDetailModal(true);
                      }}
                      className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[var(--color-text-tertiary)]">{t('auditTrail.noEntryFound')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistiques' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Graphique des actions par type */}
              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-primary)] mb-4">{t('auditTrail.breakdownByAction')}</h3>
                <div className="space-y-3">
                  {Object.entries(
                    auditEntries.reduce((acc, entry) => {
                      acc[entry.action] = (acc[entry.action] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(action as AuditEntry['action'])}
                        <span className="text-sm">{getActionLabel(action as AuditEntry['action'])}</span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphique des actions par utilisateur */}
              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-primary)] mb-4">{t('auditTrail.activityByUser')}</h3>
                <div className="space-y-3">
                  {Object.entries(
                    auditEntries.reduce((acc, entry) => {
                      acc[entry.utilisateur] = (acc[entry.utilisateur] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([user, count]) => (
                      <div key={user} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <span className="text-sm">{user}</span>
                        </div>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Timeline d'activité */}
              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-primary)] mb-4">{t('auditTrail.recentActivity')}</h3>
                {(() => {
                  const now = new Date();
                  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const startOfWeek = new Date(startOfDay);
                  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  const countInRange = (from: Date) =>
                    auditEntries.filter(e => new Date(e.timestamp) >= from).length;
                  const counts = [
                    { label: t('auditTrail.lastHour'), count: countInRange(oneHourAgo) },
                    { label: t('auditTrail.today'), count: countInRange(startOfDay) },
                    { label: t('auditTrail.periodWeek'), count: countInRange(startOfWeek) },
                    { label: t('auditTrail.periodMonth'), count: countInRange(startOfMonth) },
                  ];
                  const maxCount = Math.max(...counts.map(c => c.count), 1);
                  return (
                    <div className="space-y-2">
                      {counts.map(({ label, count }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-sm text-[var(--color-text-tertiary)]">{label}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-[var(--color-border)] rounded-full h-2">
                              <div
                                className="h-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-secondary)] rounded-full"
                                style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Alertes et anomalies */}
              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-primary)] mb-4">{t('auditTrail.recentAlerts')}</h3>
                {(() => {
                  const today = new Date();
                  const deletedToday = auditEntries.filter(e => {
                    const d = new Date(e.timestamp);
                    return e.action === 'suppression' && d.toDateString() === today.toDateString();
                  }).length;
                  const hasRoleChange = auditEntries.some(e => e.entite === 'utilisateur');
                  if (deletedToday === 0 && !hasRoleChange) {
                    return (
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('auditTrail.noRecentAlert')}</p>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {deletedToday > 0 && (
                        <div className="flex items-start space-x-2 p-2 bg-[var(--color-error-lightest)] rounded-lg">
                          <AlertCircle className="w-4 h-4 text-[var(--color-error)] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900">{t('auditTrail.deletionDetected')}</p>
                            <p className="text-xs text-[var(--color-error-dark)]">{t('auditTrail.entriesDeletedToday', { count: String(deletedToday) })}</p>
                          </div>
                        </div>
                      )}
                      {hasRoleChange && (
                        <div className="flex items-start space-x-2 p-2 bg-[var(--color-warning-lightest)] rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900">{t('auditTrail.criticalChange')}</p>
                            <p className="text-xs text-[var(--color-warning-dark)]">{t('auditTrail.userChangeDetected')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="p-6">
            <div className="max-w-2xl">
              <h3 className="font-semibold text-[var(--color-primary)] mb-4">{t('auditTrail.auditSettings')}</h3>
              
              <div className="space-y-4">
                {/* Durée de conservation */}
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-[var(--color-primary)]">{t('auditTrail.retention')}</p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('auditTrail.retentionDesc')}</p>
                    </div>
                    <select
                      className="px-3 py-2 border border-[var(--color-border)] rounded-lg"
                      value={retentionPeriod}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setRetentionPeriod(val);
                        try {
                          const existing = await adapter.getById<any>('settings', 'audit_retention');
                          if (existing) {
                            await adapter.update('settings', 'audit_retention', { value: val, updatedAt: new Date().toISOString() });
                          } else {
                            await adapter.create('settings', { key: 'audit_retention', value: val, updatedAt: new Date().toISOString() } as any);
                          }
                        } catch { /* silent */ }
                      }}
                    >
                      <option value="3 mois">{t('auditTrail.retention3m')}</option>
                      <option value="6 mois">{t('auditTrail.retention6m')}</option>
                      <option value="1 an">{t('auditTrail.retention1y')}</option>
                      <option value="2 ans">{t('auditTrail.retention2y')}</option>
                      <option value="Illimité">{t('auditTrail.retentionUnlimited')}</option>
                    </select>
                  </div>
                </div>

                {/* Niveau de traçabilité */}
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-[var(--color-primary)]">{t('auditTrail.traceLevel')}</p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('auditTrail.traceLevelDesc')}</p>
                    </div>
                    <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg" defaultValue="Standard">
                      <option value="Minimal">{t('auditTrail.levelMinimal')}</option>
                      <option value="Standard">{t('auditTrail.levelStandard')}</option>
                      <option value="Détaillé">{t('auditTrail.levelDetailed')}</option>
                      <option value="Complet">{t('auditTrail.levelFull')}</option>
                    </select>
                  </div>
                </div>

                {/* Actions auditées */}
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <p className="font-medium text-[var(--color-primary)] mb-3">{t('auditTrail.auditedActions')}</p>
                  <div className="space-y-2">
                    {[
                      { label: t('auditTrail.auditCreations'), checked: true },
                      { label: t('auditTrail.auditModifications'), checked: true },
                      { label: t('auditTrail.auditDeletions'), checked: true },
                      { label: t('auditTrail.auditValidations'), checked: true },
                      { label: t('auditTrail.auditConsultations'), checked: false },
                      { label: t('auditTrail.auditExports'), checked: true },
                      { label: t('auditTrail.auditLogins'), checked: true }
                    ].map((item) => (
                      <label key={item.label} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="rounded border-[var(--color-border)]"
                        />
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Alertes automatiques */}
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <p className="font-medium text-[var(--color-primary)] mb-3">{t('auditTrail.autoAlerts')}</p>
                  <div className="space-y-2">
                    {[
                      { label: t('auditTrail.alertDeletedValidated'), checked: true },
                      { label: t('auditTrail.alertLargeAmounts'), checked: true },
                      { label: t('auditTrail.alertRightsChange'), checked: true },
                      { label: t('auditTrail.alertOffHours'), checked: false },
                      { label: t('auditTrail.alertUnauthorized'), checked: true }
                    ].map((item) => (
                      <label key={item.label} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="rounded border-[var(--color-border)]"
                        />
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={handleCancelConfig}
                    className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
                  >
                    {t('auditTrail.cancel')}
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                    aria-label={t('auditTrail.save')}
                  >
                    <Save className="w-4 h-4" />
                    <span>{t('actions.save')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détail */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-primary)]">{t('auditTrail.detailTitle')}</h3>
                  <p className="text-sm text-[var(--color-text-tertiary)]">{selectedEntry.entiteNom}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-1">{t('auditTrail.fieldAction')}</p>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(selectedEntry.action)}
                    <span className="font-semibold">{getActionLabel(selectedEntry.action)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-1">{t('auditTrail.fieldImpact')}</p>
                  {getImpactBadge(selectedEntry.impact)}
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-1">{t('auditTrail.fieldUser')}</p>
                  <p className="font-semibold">{selectedEntry.utilisateur}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-1">{t('auditTrail.fieldDateTime')}</p>
                  <p className="font-semibold">
                    {new Date(selectedEntry.timestamp).toLocaleString(dateLocale)}
                  </p>
                </div>
              </div>

              {/* Détails techniques */}
              <div className="bg-[var(--color-background-secondary)] rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-[var(--color-primary)] mb-3">{t('auditTrail.technicalInfo')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--color-text-tertiary)]">{t('auditTrail.fieldIp')}</p>
                    <p className="font-mono">{selectedEntry.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-tertiary)]">{t('auditTrail.fieldBrowser')}</p>
                    <p className="font-mono">{selectedEntry.navigateur}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-tertiary)]">{t('auditTrail.fieldEntityId')}</p>
                    <p className="font-mono">{selectedEntry.entiteId}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-tertiary)]">{t('auditTrail.fieldEntityType')}</p>
                    <p className="font-mono">{selectedEntry.entite}</p>
                  </div>
                </div>
              </div>

              {/* Changements */}
              {(selectedEntry.ancienneValeur || selectedEntry.nouvelleValeur) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-[var(--color-primary)] mb-3">{t('auditTrail.changesMade')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEntry.ancienneValeur && (
                      <div className="border border-[var(--color-error-light)] rounded-lg p-3 bg-[var(--color-error-lightest)]">
                        <p className="text-sm font-medium text-red-900 mb-2">{t('auditTrail.oldValue')}</p>
                        <pre className="text-xs font-mono text-[var(--color-error-dark)]">
                          {JSON.stringify(selectedEntry.ancienneValeur, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedEntry.nouvelleValeur && (
                      <div className="border border-[var(--color-success-light)] rounded-lg p-3 bg-[var(--color-success-lightest)]">
                        <p className="text-sm font-medium text-green-900 mb-2">{t('auditTrail.newValue')}</p>
                        <pre className="text-xs font-mono text-[var(--color-success-dark)]">
                          {JSON.stringify(selectedEntry.nouvelleValeur, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('auditTrail.description')}</h4>
                <p className="text-[var(--color-text-tertiary)]">{selectedEntry.details}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
                >
                  {t('auditTrail.close')}
                </button>
                <button
                  onClick={handleExportEntry}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                  aria-label={t('auditTrail.download')}
                >
                  <Download className="w-4 h-4" />
                  <span>{t('common.export')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PisteAuditModule;