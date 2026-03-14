import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { Report, ExportFormat } from '@/types/reportStudio';
import { Send, ClipboardCheck, FileText, FileType, Presentation, Sheet, Globe, Paintbrush, Share2 } from 'lucide-react';
import ReportDesignEditor from './Design/ReportDesignEditor';
import ShareReportModal from './Modals/ShareReportModal';

interface ReportHeaderProps {
  report: Report;
  mode: 'view' | 'edit';
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  zoom: number;
  onSave: () => void;
  onSaveWithMetadata?: () => void;
  onExport: (format: ExportFormat) => void;
  onZoomChange: (zoom: number) => void;
  onModeToggle: () => void;
  onSubmitForReview?: () => void;
  isSubmittingReview?: boolean;
  onOpenDesign?: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  mode,
  hasUnsavedChanges,
  isSaving,
  zoom,
  onSave,
  onSaveWithMetadata,
  onExport,
  onZoomChange,
  onModeToggle,
  onSubmitForReview,
  isSubmittingReview = false,
  onOpenDesign,
}) => {
  const { t } = useTranslation();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(report.title);
  const [showDesignEditor, setShowDesignEditor] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const statusColors = {
    collecting_data: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-primary-100 text-primary-800',
    generating: 'bg-info/10 text-info',
    review: 'bg-primary-100 text-primary-800',
    published: 'bg-success/10 text-success',
    archived: 'bg-primary-200 text-primary-600',
  };

  const statusLabels = {
    collecting_data: 'Collecte de données',
    draft: 'Brouillon',
    generating: 'Génération...',
    review: 'En révision',
    published: 'Publié',
    archived: 'Archivé',
  };

  const exportFormats: { format: ExportFormat; label: string; icon: React.ElementType }[] = [
    { format: 'pdf', label: 'PDF', icon: FileText },
    { format: 'docx', label: 'Word', icon: FileType },
    { format: 'pptx', label: 'PowerPoint', icon: Presentation },
    { format: 'xlsx', label: 'Excel', icon: Sheet },
    { format: 'html', label: 'HTML', icon: Globe },
  ];

  const zoomOptions = [50, 75, 100, 125, 150, 200];

  return (
    <header className="bg-white border-b border-primary-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left section - Back button and title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
            title="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                className="text-lg font-semibold border-b-2 border-primary outline-none px-1"
                autoFocus
              />
            ) : (
              <h1
                className="text-lg font-semibold text-primary-900 cursor-pointer hover:text-primary"
                onClick={() => mode === 'edit' && setIsEditing(true)}
                title={mode === 'edit' ? 'Cliquer pour modifier' : ''}
              >
                {title}
              </h1>
            )}

            {/* Status badge */}
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              statusColors[report.status]
            )}>
              {statusLabels[report.status]}
            </span>

            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600">
                (modifications non sauvegardées)
              </span>
            )}
          </div>
        </div>

        {/* Center section - Version and metadata */}
        <div className="flex items-center gap-4 text-sm text-primary-500">
          <span>v{report.version}</span>
          <span>•</span>
          <span>
            {report.createdAt && new Date(report.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {report.dataCompleteness && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-primary-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${report.dataCompleteness * 100}%` }}
                  />
                </div>
                <span>{Math.round(report.dataCompleteness * 100)}%</span>
              </span>
            </>
          )}
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom control */}
          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={() => onZoomChange(Math.max(50, zoom - 25))}
              className="p-1 hover:bg-primary-100 rounded"
              disabled={zoom <= 50}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <select
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              {zoomOptions.map((z) => (
                <option key={z} value={z}>{z}%</option>
              ))}
            </select>
            <button
              onClick={() => onZoomChange(Math.min(200, zoom + 25))}
              className="p-1 hover:bg-primary-100 rounded"
              disabled={zoom >= 200}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Mode toggle */}
          <button
            onClick={onModeToggle}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              mode === 'edit'
                ? 'bg-primary text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            )}
          >
            {mode === 'edit' ? 'Mode édition' : 'Mode lecture'}
          </button>

          {/* Save button group */}
          <div className="flex items-center">
            <button
              onClick={onSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={cn(
                'px-4 py-1.5 rounded-l-lg text-sm font-medium transition-colors flex items-center gap-2',
                hasUnsavedChanges
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-primary-100 text-primary-400 cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Sauvegarder
                </>
              )}
            </button>
            {onSaveWithMetadata && (
              <button
                onClick={onSaveWithMetadata}
                disabled={isSaving}
                className={cn(
                  'px-2 py-1.5 rounded-r-lg text-sm font-medium transition-colors border-l border-primary-dark/20',
                  'bg-primary text-white hover:bg-primary-dark'
                )}
                title="Enregistrer avec workflow"
              >
                <ClipboardCheck className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Submit for Review button */}
          {onSubmitForReview && report.status === 'draft' && (
            <button
              onClick={onSubmitForReview}
              disabled={isSubmittingReview || hasUnsavedChanges}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                hasUnsavedChanges
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
              )}
              title={hasUnsavedChanges ? t('reports.reviews.save_first') : t('reports.reviews.submit.title')}
            >
              {isSubmittingReview ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common.submitting')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('reports.reviews.submit.title')}
                </>
              )}
            </button>
          )}

          {/* Review status indicator */}
          {report.status === 'review' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <ClipboardCheck className="w-4 h-4" />
              {t('reports.reviews.statuses.pending')}
            </div>
          )}

          {/* Design button */}
          <button
            onClick={() => onOpenDesign ? onOpenDesign() : setShowDesignEditor(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-700 transition-colors flex items-center gap-2"
            title="Design du rapport"
          >
            <Paintbrush className="w-4 h-4" />
            Design
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Exporter
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-primary-200 py-1 z-50">
                {exportFormats.map(({ format, label, icon: Icon }) => (
                  <button
                    key={format}
                    onClick={() => {
                      onExport(format);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-primary-50 flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span>Exporter en {label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>

          {/* History button */}
          <button
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
            title="Historique des versions"
          >
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Design Editor Modal - only show local version if onOpenDesign not provided */}
      {!onOpenDesign && (
        <ReportDesignEditor
          isOpen={showDesignEditor}
          onClose={() => setShowDesignEditor(false)}
          onSave={() => {
            setShowDesignEditor(false);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareReportModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        reportId={report.id}
        reportTitle={report.title}
      />
    </header>
  );
};
