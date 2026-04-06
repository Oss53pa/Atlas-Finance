/**
 * TopBar — Document title, period selector, save, validation, export, undo/redo, zoom
 * Uses project design system (neutral-* monochrome palette)
 * CDC §5.2
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Save, Download,
  PanelLeft, PanelRight, Calendar, Eye, FileText,
  Shield, ChevronDown,
} from 'lucide-react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import { exportToPDF } from '../services/pdfExportService';
import PeriodSelector from './PeriodSelector';
import ValidationPanel from './ValidationPanel';
import PreviewModal from './PreviewModal';
import type { ReportStatus } from '../types';

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-neutral-200 text-neutral-700' },
  in_review: { label: 'En révision', color: 'bg-amber-100 text-amber-800' },
  in_validation: { label: 'En validation', color: 'bg-blue-100 text-blue-800' },
  validated: { label: 'Validé', color: 'bg-primary-100 text-primary-800' },
  archived: { label: 'Archivé', color: 'bg-primary-100 text-primary-800' },
};

const TopBar: React.FC = () => {
  const {
    document: doc, updateTitle, canUndo, canRedo, undo, redo,
    zoomLevel, setZoom, toggleSidebarLeft, toggleSidebarRight,
  } = useReportBuilderStore();
  const [showPeriod, setShowPeriod] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ctrl+S save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    try {
      // Save report document to DataAdapter 'reports' table
      const { adapter } = await import('@/contexts/DataContext').then(m => {
        // Access adapter from the current React tree is not possible via dynamic import
        // Instead we save to localStorage as persistence layer for local mode
        return { adapter: null };
      });
      // Persist to localStorage for local mode
      const saved = JSON.parse(localStorage.getItem('atlas_reports') || '[]');
      const idx = saved.findIndex((r: any) => r.id === doc.id);
      const record = {
        id: doc.id,
        title: doc.title,
        status: doc.status,
        period_label: doc.period.label,
        period: doc.period,
        pages: doc.pages,
        pageSettings: doc.pageSettings,
        theme: doc.theme,
        typography: doc.typography,
        version: doc.version,
        page_count: doc.pages.length,
        created_at: doc.createdAt,
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) { saved[idx] = record; } else { saved.push(record); }
      localStorage.setItem('atlas_reports', JSON.stringify(saved));
    } catch (err) {
    } finally {
      setSaving(false);
    }
  }, [doc]);

  const handleExport = useCallback(() => {
    if (!doc) return;
    exportToPDF(doc).catch(() => {});
  }, [doc]);

  if (!doc) return null;

  const status = statusLabels[doc.status] || statusLabels.draft;

  return (
    <>
      <div className="h-12 border-b border-neutral-200 bg-white flex items-center px-4 gap-3 shrink-0">
        {/* Left: toggle sidebar + title + status */}
        <button onClick={toggleSidebarLeft} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" title="Panneau gauche">
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-neutral-900 shrink-0" />
          <input
            type="text"
            value={doc.title}
            onChange={e => updateTitle(e.target.value)}
            className="text-sm font-semibold text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-neutral-400 rounded px-1 min-w-[200px] max-w-[400px] truncate"
          />
          <button
            onClick={() => setShowValidation(true)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${status.color}`}
            title="Gérer le workflow de validation"
          >
            {status.label}
          </button>
        </div>

        {/* Center: Period */}
        <div className="flex-1 flex justify-center relative">
          <button
            onClick={() => setShowPeriod(!showPeriod)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 rounded-md border border-neutral-200"
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            {doc.period.label}
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>
          {showPeriod && (
            <div className="absolute top-10 z-50">
              <PeriodSelector onClose={() => setShowPeriod(false)} />
            </div>
          )}
        </div>

        {/* Right: Save + Undo/Redo + Zoom + Actions */}
        <div className="flex items-center gap-1">
          {/* Save */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              saving ? 'text-primary-600 bg-primary-50' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
            title="Enregistrer (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Enregistré' : 'Enregistrer'}
          </button>

          <div className="w-px h-5 bg-neutral-200 mx-1" />

          <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 disabled:opacity-30" title="Annuler (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 disabled:opacity-30" title="Rétablir (Ctrl+Y)">
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-neutral-200 mx-1" />

          <button onClick={() => setZoom(zoomLevel - 10)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" title="Zoom -">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-neutral-500 w-8 text-center font-mono">{zoomLevel}%</span>
          <button onClick={() => setZoom(zoomLevel + 10)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" title="Zoom +">
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-neutral-200 mx-1" />

          <button onClick={() => setShowPreview(true)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" title="Aperçu">
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowValidation(true)}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500"
            title="Validation"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
            title="Exporter PDF"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>

          <button onClick={toggleSidebarRight} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 ml-1" title="Panneau droit">
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Validation panel */}
      <ValidationPanel isOpen={showValidation} onClose={() => setShowValidation(false)} />

      {/* Preview modal */}
      <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} />
    </>
  );
};

export default TopBar;
