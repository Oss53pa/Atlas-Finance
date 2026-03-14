/**
 * ReportDesignEditor - Main editor for report design settings
 */

import React, { useState } from 'react';
import {
  X,
  FileText,
  List,
  BookOpen,
  Type,
  Palette,
  Building2,
  LayoutGrid,
  Users,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  FileBox,
} from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import CoverPageEditor from './CoverPageEditor';
import TableOfContentsEditor from './TableOfContentsEditor';
import BackCoverEditor from './BackCoverEditor';
import TypographyEditor from './TypographyEditor';
import ColorSchemeEditor from './ColorSchemeEditor';
import BrandingEditor from './BrandingEditor';
import PageFormatEditor from './PageFormatEditor';
import TemplateLibrary from './TemplateLibrary';
import RecipientSelector from './RecipientSelector';

interface ReportDesignEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

type EditorSection = 'recipient' | 'format' | 'cover' | 'toc' | 'back' | 'typography' | 'colors' | 'branding';

const ReportDesignEditor: React.FC<ReportDesignEditorProps> = ({ isOpen, onClose, onSave }) => {
  const [activeSection, setActiveSection] = useState<EditorSection>('recipient');
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { settings, hasUnsavedChanges, resetToDefaults, applyTemplate, markAsSaved } =
    useReportDesignStore();

  const sections: { id: EditorSection; label: string; icon: React.ElementType }[] = [
    { id: 'recipient', label: 'Destinataire', icon: Users },
    { id: 'format', label: 'Format page', icon: FileBox },
    { id: 'cover', label: 'Page de garde', icon: FileText },
    { id: 'toc', label: 'Sommaire', icon: List },
    { id: 'back', label: 'Couverture dos', icon: BookOpen },
    { id: 'typography', label: 'Typographie', icon: Type },
    { id: 'colors', label: 'Couleurs', icon: Palette },
    { id: 'branding', label: 'Branding', icon: Building2 },
  ];

  const handleSave = () => {
    markAsSaved();
    onSave?.();
    onClose();
  };

  const handleTemplateSelect = (templateId: string) => {
    applyTemplate(templateId);
    setShowTemplateLibrary(false);
  };

  const renderEditor = () => {
    switch (activeSection) {
      case 'recipient':
        return <RecipientSelector />;
      case 'format':
        return <PageFormatEditor />;
      case 'cover':
        return <CoverPageEditor />;
      case 'toc':
        return <TableOfContentsEditor />;
      case 'back':
        return <BackCoverEditor />;
      case 'typography':
        return <TypographyEditor />;
      case 'colors':
        return <ColorSchemeEditor />;
      case 'branding':
        return <BrandingEditor />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Panel */}
        <div className="relative ml-auto flex h-full w-full max-w-4xl bg-white shadow-2xl">
          {/* Sidebar */}
          <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Design du rapport</h2>
              <p className="text-xs text-gray-500 mt-1">Personnalisez l'apparence</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </nav>

            {/* Template button */}
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={() => setShowTemplateLibrary(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Modeles
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-gray-900">
                  {sections.find((s) => s.id === activeSection)?.label}
                </h3>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    Non sauvegarde
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Preview toggle */}
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    previewMode
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Apercu
                </button>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {previewMode ? (
                <DesignPreview settings={settings} />
              ) : (
                <div className="p-6">{renderEditor()}</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reinitialiser
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Library Modal */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelect={handleTemplateSelect}
      />
    </>
  );
};

// Design Preview Component
const DesignPreview: React.FC<{ settings: any }> = ({ settings }) => {
  const getPageAspectRatio = () => {
    const isLandscape = settings.pageFormat?.orientation === 'landscape';
    return isLandscape ? 'aspect-[4/3]' : 'aspect-[3/4]';
  };

  return (
    <div className="p-6 bg-gray-100 min-h-full">
      {/* Page Format Info */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-center gap-4 text-sm text-gray-600">
        <span className="px-3 py-1 bg-white rounded-full border border-gray-200">
          {settings.pageFormat?.size || 'A4'}
        </span>
        <span className="px-3 py-1 bg-white rounded-full border border-gray-200">
          {settings.pageFormat?.orientation === 'landscape' ? 'Paysage' : 'Portrait'}
        </span>
        <span className="px-3 py-1 bg-white rounded-full border border-gray-200">
          Marges: {settings.pageFormat?.margins?.top || 20}mm
        </span>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Cover page preview */}
        {settings.coverPage.enabled && (
          <div
            className={`${getPageAspectRatio()} rounded-lg shadow-lg p-8 flex flex-col justify-center items-center`}
            style={{
              background:
                settings.coverPage.backgroundOverlay ||
                settings.colors.primary ||
                '#6366f1',
              fontFamily: settings.typography.headingFont,
            }}
          >
            {settings.coverPage.logo && (
              <img
                src={settings.coverPage.logo}
                alt="Logo"
                className="h-12 object-contain mb-6"
              />
            )}
            <h1
              className="text-3xl font-bold text-white text-center mb-2"
              style={{ fontFamily: settings.typography.headingFont }}
            >
              {settings.coverPage.title || 'Titre du rapport'}
            </h1>
            {settings.coverPage.subtitle && (
              <p className="text-lg text-white/80 text-center">{settings.coverPage.subtitle}</p>
            )}
            <div className="mt-8 text-sm text-white/60 text-center">
              {settings.coverPage.author && <div>{settings.coverPage.author}</div>}
              {settings.coverPage.date && <div>{settings.coverPage.date}</div>}
              {settings.coverPage.organization && <div>{settings.coverPage.organization}</div>}
            </div>
          </div>
        )}

        {/* Table of contents preview */}
        {settings.tableOfContents.enabled && (
          <div
            className="bg-white rounded-lg shadow-lg p-8"
            style={{
              fontFamily: settings.typography.bodyFont,
              color: settings.colors.text,
            }}
          >
            <h2
              className="text-2xl font-bold mb-6"
              style={{
                fontFamily: settings.typography.headingFont,
                color: settings.colors.primary,
              }}
            >
              {settings.tableOfContents.title}
            </h2>
            <div className="space-y-3">
              {['Introduction', 'Analyse des donnees', 'Resultats', 'Conclusion'].map(
                (item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-gray-100 pb-2"
                  >
                    <span>{item}</span>
                    {settings.tableOfContents.showPageNumbers && (
                      <span className="text-gray-400">{i + 1}</span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Content page preview */}
        <div
          className="bg-white rounded-lg shadow-lg p-8"
          style={{
            fontFamily: settings.typography.bodyFont,
            color: settings.colors.text,
            backgroundColor: settings.colors.background,
          }}
        >
          {/* Header */}
          {settings.branding.headerTemplate && (
            <div className="text-xs text-gray-400 border-b border-gray-100 pb-2 mb-4">
              {settings.branding.headerTemplate
                .replace('{{companyName}}', settings.branding.companyName || 'Entreprise')
                .replace('{{reportTitle}}', 'Titre du rapport')}
            </div>
          )}

          {/* Content */}
          <h2
            className="text-xl font-bold mb-4"
            style={{
              fontFamily: settings.typography.headingFont,
              color: settings.colors.primary,
            }}
          >
            Section du rapport
          </h2>
          <p
            style={{
              lineHeight:
                settings.typography.lineHeight === 'compact'
                  ? '1.4'
                  : settings.typography.lineHeight === 'normal'
                  ? '1.6'
                  : '1.8',
              fontSize:
                settings.typography.fontSize === 'small'
                  ? '14px'
                  : settings.typography.fontSize === 'medium'
                  ? '16px'
                  : '18px',
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
            quis nostrud exercitation ullamco laboris.
          </p>

          {/* Footer */}
          <div className="mt-8 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>{settings.branding.footerTemplate || ''}</span>
            {settings.branding.showPageNumbers && <span>Page 3 / 10</span>}
          </div>
        </div>

        {/* Back cover preview */}
        {settings.backCover.enabled && (
          <div
            className={`${getPageAspectRatio()} rounded-lg shadow-lg p-8 flex flex-col justify-center items-center`}
            style={{
              background: settings.colors.primary,
              fontFamily: settings.typography.bodyFont,
            }}
          >
            {settings.backCover.showLogo && settings.coverPage.logo && (
              <img
                src={settings.coverPage.logo}
                alt="Logo"
                className="h-16 object-contain mb-6"
              />
            )}
            {settings.backCover.showContact && settings.backCover.contactInfo && (
              <div className="text-white/80 text-center text-sm space-y-1">
                {settings.backCover.contactInfo.name && (
                  <div className="font-bold text-white">
                    {settings.backCover.contactInfo.name}
                  </div>
                )}
                {settings.backCover.contactInfo.email && (
                  <div>{settings.backCover.contactInfo.email}</div>
                )}
                {settings.backCover.contactInfo.phone && (
                  <div>{settings.backCover.contactInfo.phone}</div>
                )}
                {settings.backCover.contactInfo.website && (
                  <div>{settings.backCover.contactInfo.website}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDesignEditor;
