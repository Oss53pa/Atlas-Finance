// @ts-nocheck
/**
 * Report Journal Page — Page indépendante listant tous les rapports
 * Avec filtres, statuts, actions, et bouton "Nouveau Rapport" vers le Builder
 */
import React, { useState, useEffect } from 'react';
import {
  Plus, Search, FileText, Clock, CheckCircle, AlertCircle,
  Archive, Eye, Copy, Trash2, Download, MoreHorizontal,
  Calendar, User, Tag, Filter, BarChart3, ChevronDown,
  ArrowUpDown, LayoutGrid, List,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';

// ============================================================================
// Types
// ============================================================================

interface ReportEntry {
  id: string;
  title: string;
  status: 'draft' | 'in_review' | 'in_validation' | 'validated' | 'archived';
  period: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  pageCount: number;
  template?: string;
  type?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  draft: { label: 'Brouillon', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-neutral-600', bg: 'bg-neutral-100' },
  in_review: { label: 'En révision', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-amber-700', bg: 'bg-amber-50' },
  in_validation: { label: 'En validation', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-blue-700', bg: 'bg-blue-50' },
  validated: { label: 'Validé', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-primary-700', bg: 'bg-primary-50' },
  archived: { label: 'Archivé', icon: <Archive className="w-3.5 h-3.5" />, color: 'text-primary-700', bg: 'bg-primary-50' },
};

// Pas de données hardcodées — les rapports viennent du DataAdapter (table 'reports')
// En mode local/dev, le journal démarre vide et se remplit quand on crée des rapports.

// ============================================================================
// KPI Cards
// ============================================================================

const KPICards: React.FC<{ reports: ReportEntry[] }> = ({ reports }) => {
  const total = reports.length;
  const drafts = reports.filter(r => r.status === 'draft').length;
  const validated = reports.filter(r => r.status === 'validated').length;
  const archived = reports.filter(r => r.status === 'archived').length;

  const cards = [
    { label: 'Total Rapports', value: total, icon: <FileText className="w-5 h-5" />, color: 'text-neutral-900' },
    { label: 'Brouillons', value: drafts, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600' },
    { label: 'Validés', value: validated, icon: <CheckCircle className="w-5 h-5" />, color: 'text-primary-600' },
    { label: 'Archivés', value: archived, icon: <Archive className="w-5 h-5" />, color: 'text-primary-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`${card.color}`}>{card.icon}</span>
          </div>
          <div className="text-2xl font-bold text-neutral-900">{card.value}</div>
          <div className="text-xs text-neutral-500 mt-0.5">{card.label}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Report Row
// ============================================================================

const ReportRow: React.FC<{ report: ReportEntry; onOpen: () => void }> = ({ report, onOpen }) => {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusConfig[report.status];
  const updatedDate = new Date(report.updatedAt);

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-sm transition-all group">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-neutral-500" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900 truncate">{report.title}</span>
          <span className="text-[9px] text-neutral-400 font-mono">v{report.version}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{report.period}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.createdBy}</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{report.pageCount} pages</span>
          {report.template && (
            <span className="flex items-center gap-1 text-neutral-400"><Tag className="w-3 h-3" />{report.template}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${status.bg} ${status.color}`}>
        {status.icon}
        {status.label}
      </div>

      {/* Date */}
      <div className="text-xs text-neutral-400 shrink-0 w-24 text-right">
        {updatedDate.toLocaleDateString('fr-FR')}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onOpen}
          className="px-3 py-1.5 text-[11px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Ouvrir
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 w-44">
                <button onClick={onOpen} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50">
                  <Eye className="w-3.5 h-3.5" /> Ouvrir dans le Builder
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50">
                  <Copy className="w-3.5 h-3.5" /> Dupliquer
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50">
                  <Download className="w-3.5 h-3.5" /> Exporter PDF
                </button>
                <hr className="my-1 border-neutral-100" />
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

interface JournalPageProps {
  onOpenBuilder?: (title?: string) => void;
  onGoToTemplates?: () => void;
}

const ReportJournalPage: React.FC<JournalPageProps> = ({ onOpenBuilder, onGoToTemplates }) => {
  const { adapter } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Load reports from DataAdapter on mount
  useEffect(() => {
    if (!adapter) return;
    adapter.getAll('reports')
      .then((data: any[]) => {
        const entries: ReportEntry[] = (data || []).map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          title: r.title || r.name || 'Sans titre',
          status: r.status || 'draft',
          period: r.period_label || r.period?.label || '',
          createdBy: r.created_by || 'Utilisateur',
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
          version: r.version || 1,
          pageCount: r.page_count || r.pages?.length || 0,
          template: r.template_name || r.template,
        }));
        setReports(entries);
      })
      .catch(() => {
        // Table 'reports' may not exist yet — fall back to localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('atlas_reports') || '[]');
          const entries: ReportEntry[] = saved.map((r: any) => ({
            id: r.id,
            title: r.title || 'Sans titre',
            status: r.status || 'draft',
            period: r.period_label || '',
            createdBy: r.created_by || 'Utilisateur',
            createdAt: r.created_at || new Date().toISOString(),
            updatedAt: r.updated_at || new Date().toISOString(),
            version: r.version || 1,
            pageCount: r.page_count || 0,
            template: r.template_name,
          }));
          setReports(entries);
        } catch {
          setReports([]);
        }
      });
  }, [adapter]);

  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.period.toLowerCase().includes(q) || (r.template || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Ouvrir un rapport existant → switch vers Builder
  const handleOpen = (_report: ReportEntry) => {
    onOpenBuilder?.(_report.title);
  };

  // Nouveau rapport vierge → crée brouillon + ouvre dans Builder
  const handleNewBlank = () => {
    setShowNewDialog(false);
    onOpenBuilder?.('Nouveau Rapport');
  };

  // Depuis un modèle → bascule sur l'onglet Modèles
  const handleFromTemplate = () => {
    setShowNewDialog(false);
    onGoToTemplates?.();
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Journal des Rapports</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Gérez et consultez tous vos rapports financiers</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNewDialog(!showNewDialog)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau Rapport
          </button>

          {/* Dialog choix : Vierge ou Modèle */}
          {showNewDialog && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNewDialog(false)} />
              <div className="absolute right-0 top-12 z-20 bg-white border border-neutral-200 rounded-2xl shadow-xl w-[360px] p-5">
                <div className="text-sm font-semibold text-neutral-900 mb-1">Créer un nouveau rapport</div>
                <p className="text-xs text-neutral-500 mb-4">Choisissez comment démarrer :</p>

                <div className="space-y-3">
                  {/* Option 1 : Vierge */}
                  <button
                    onClick={handleNewBlank}
                    className="w-full flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-neutral-200">
                      <FileText className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">Rapport vierge</div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Commencez de zéro avec un document vide. Construisez votre structure depuis le sommaire.</p>
                    </div>
                  </button>

                  {/* Option 2 : Depuis un modèle */}
                  <button
                    onClick={handleFromTemplate}
                    className="w-full flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-neutral-200">
                      <Copy className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">Depuis un modèle</div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Utilisez un modèle prédéfini (Rapport DG, Annuel, Trésorerie, Fiscal…) avec une structure prête à l'emploi.</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <KPICards reports={reports} />

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un rapport…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Tous ({reports.length})
          </button>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-neutral-400 mb-3">
        {filtered.length} rapport{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
      </div>

      {/* Report list */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(report => (
            <ReportRow key={report.id} report={report} onOpen={() => handleOpen(report)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(report => {
            const status = statusConfig[report.status];
            const date = new Date(report.updatedAt);
            return (
              <div
                key={report.id}
                onClick={() => handleOpen(report)}
                className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-neutral-500" />
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
                <div className="text-sm font-semibold text-neutral-900 mb-1 line-clamp-2">{report.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 mb-2">
                  <span>{report.period}</span>
                  <span>·</span>
                  <span>{report.pageCount} pages</span>
                  <span>·</span>
                  <span>v{report.version}</span>
                </div>
                {report.template && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-full">
                    <Tag className="w-2.5 h-2.5" />{report.template}
                  </span>
                )}
                <div className="text-[10px] text-neutral-400 mt-2">
                  Modifié le {date.toLocaleDateString('fr-FR')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Aucun rapport trouvé</p>
          <button
            onClick={() => setShowNewDialog(true)}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl"
          >
            Créer un rapport
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportJournalPage;
