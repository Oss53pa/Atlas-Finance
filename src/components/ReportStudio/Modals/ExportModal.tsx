/**
 * ExportModal - Multi-format export dialog
 * Supports PDF, Word, Excel, PowerPoint, HTML exports
 */

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { ExportFormat } from '@/types/reportStudio';
import { FileText, FileType, Sheet, Presentation, Globe } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  reportTitle: string;
  onClose: () => void;
  onExport: (format: ExportFormat, options: ExportOptions) => void;
}

interface ExportOptions {
  format: ExportFormat;
  quality: 'draft' | 'standard' | 'high';
  pageSize: 'A4' | 'Letter' | 'A3';
  orientation: 'portrait' | 'landscape';
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  includePageNumbers: boolean;
  selectedSections?: string[];
  watermark?: string;
  password?: string;
}

interface FormatOption {
  id: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
}

const formatOptions: FormatOption[] = [
  {
    id: 'pdf',
    label: 'PDF',
    icon: FileText,
    description: 'Document portable, idéal pour le partage et l\'impression',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
  },
  {
    id: 'docx',
    label: 'Word',
    icon: FileType,
    description: 'Document éditable Microsoft Word (.docx)',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
  },
  {
    id: 'xlsx',
    label: 'Excel',
    icon: Sheet,
    description: 'Tableur avec données et graphiques (.xlsx)',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
  },
  {
    id: 'pptx',
    label: 'PowerPoint',
    icon: Presentation,
    description: 'Présentation avec une slide par section (.pptx)',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
  },
  {
    id: 'html',
    label: 'HTML',
    icon: Globe,
    description: 'Page web interactive avec graphiques dynamiques',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  reportTitle,
  onClose,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    quality: 'high',
    pageSize: 'A4',
    orientation: 'portrait',
    includeTableOfContents: true,
    includeCoverPage: true,
    includePageNumbers: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, { ...options, format: selectedFormat });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Exporter le rapport</h2>
            <p className="text-sm text-gray-500 mt-0.5">{reportTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Format Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Choisir le format</h3>
            <div className="grid grid-cols-5 gap-3">
              {formatOptions.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                      selectedFormat === format.id
                        ? `${format.bgColor} border-primary ${format.color} ring-2 ring-offset-2 ring-primary`
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-8 h-8 text-gray-500" />
                    <span className={cn(
                      'text-sm font-medium',
                      selectedFormat === format.id ? format.color : 'text-gray-700'
                    )}>
                      {format.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {formatOptions.find(f => f.id === selectedFormat)?.description}
            </p>
          </div>

          {/* Basic Options */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Taille de page
                </label>
                <select
                  value={options.pageSize}
                  onChange={(e) => setOptions({ ...options, pageSize: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="Letter">Letter (8.5 × 11 in)</option>
                  <option value="A3">A3 (297 × 420 mm)</option>
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Orientation
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOptions({ ...options, orientation: 'portrait' })}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors',
                      options.orientation === 'portrait'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <div className="w-4 h-6 border-2 border-current rounded" />
                    Portrait
                  </button>
                  <button
                    onClick={() => setOptions({ ...options, orientation: 'landscape' })}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors',
                      options.orientation === 'landscape'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <div className="w-6 h-4 border-2 border-current rounded" />
                    Paysage
                  </button>
                </div>
              </div>
            </div>

            {/* Quality (for PDF) */}
            {selectedFormat === 'pdf' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Qualité
                </label>
                <div className="flex gap-2">
                  {(['draft', 'standard', 'high'] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setOptions({ ...options, quality })}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-lg border-2 transition-colors capitalize',
                        options.quality === quality
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {quality === 'draft' && 'Brouillon'}
                      {quality === 'standard' && 'Standard'}
                      {quality === 'high' && 'Haute qualité'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeCoverPage}
                  onChange={(e) => setOptions({ ...options, includeCoverPage: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Inclure une page de couverture</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTableOfContents}
                  onChange={(e) => setOptions({ ...options, includeTableOfContents: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Inclure la table des matières</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includePageNumbers}
                  onChange={(e) => setOptions({ ...options, includePageNumbers: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Inclure les numéros de page</span>
              </label>
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <svg
                className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Options avancées
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Filigrane (optionnel)
                  </label>
                  <input
                    type="text"
                    value={options.watermark || ''}
                    onChange={(e) => setOptions({ ...options, watermark: e.target.value })}
                    placeholder="Ex: CONFIDENTIEL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                {selectedFormat === 'pdf' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mot de passe (optionnel)
                    </label>
                    <input
                      type="password"
                      value={options.password || ''}
                      onChange={(e) => setOptions({ ...options, password: e.target.value })}
                      placeholder="Protéger le PDF avec un mot de passe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-500">
            Format sélectionné : <span className="font-medium text-gray-700">{formatOptions.find(f => f.id === selectedFormat)?.label}</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                'px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
                isExporting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              )}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Export en cours...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Exporter
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
