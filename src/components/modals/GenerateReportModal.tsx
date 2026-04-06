// @ts-nocheck

/**
 * GenerateReportModal - Modal for generating reports from data imports
 * Supports two entry points:
 * - Option A: From Data Imports table (data pre-selected)
 * - Option B: From Reports list (select data source first)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileText,
  Database,
  Sparkles,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  FileSpreadsheet,
  Copy,
  Loader2,
  Search,
  LayoutTemplate,
  Folder,
  FolderPlus,
  ChevronDown,
  Plus,
  Filter,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import PeriodSelector from '@/components/common/PeriodSelector';
import { DataSourceSelector, DEFAULT_DATA_SOURCES } from '@/components/reports';

// Types
interface DataFolder {
  id: string;
  name: string;
  importCount: number;
  color: string;
}

interface DataImport {
  id: string;
  importId: string; // IMP-XXXX-XXXXX
  fileName: string;
  fileType: 'csv' | 'excel' | 'json';
  rowCount: number;
  columnCount: number;
  status: 'analyzing' | 'ready' | 'error';
  folderId: string;
  folderName: string;
  version: string;
  createdAt: string;
  aiSummary?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  isAI: boolean;
}

interface ExistingReport {
  id: string;
  title: string;
  reportTypes: string[];
  createdAt: string;
  version: number;
}

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedImports?: DataImport[];
}

type Step = 'source' | 'template' | 'options' | 'generating';

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  preSelectedImports = [],
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('source');
  const [selectedImports, setSelectedImports] = useState<DataImport[]>(preSelectedImports);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [templateMode, setTemplateMode] = useState<'catalog' | 'existing'>('catalog');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedExistingReport, setSelectedExistingReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);

  // Template dropdowns state
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showExistingDropdown, setShowExistingDropdown] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Period state
  const [periodValue, setPeriodValue] = useState({
    preset: 'last_month',
    label: 'Mois dernier',
  });

  // Mock data - Folders
  const dataFolders: DataFolder[] = [
    { id: 'folder-1', name: 'Données Comptables', importCount: 12, color: '#10B981' },
    { id: 'folder-2', name: 'Données Commerciales', importCount: 8, color: '#6366F1' },
    { id: 'folder-3', name: 'Données RH', importCount: 5, color: '#F59E0B' },
    { id: 'folder-4', name: 'Données Marketing', importCount: 15, color: '#EC4899' },
  ];

  const totalImportCount = useMemo(() => {
    return dataFolders.reduce((acc, folder) => acc + folder.importCount, 0);
  }, []);

  const selectedFolder = dataFolders.find(f => f.id === selectedFolderId);

  // Reset when modal opens with pre-selected imports
  useEffect(() => {
    if (isOpen) {
      setSelectedImports(preSelectedImports);
      setSelectedDataSources([]);
      // Skip source step if imports are pre-selected
      if (preSelectedImports.length > 0) {
        setCurrentStep('template');
      } else {
        setCurrentStep('source');
      }
      setSelectedTemplates([]);
      setSelectedExistingReport(null);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [isOpen, preSelectedImports]);

  // Mock data - Available imports
  const allAvailableImports: DataImport[] = [
    {
      id: '1',
      importId: 'IMP-2024-00089',
      fileName: 'grand_livre_2024.csv',
      fileType: 'csv',
      rowCount: 1245,
      columnCount: 12,
      status: 'ready',
      folderId: 'folder-1',
      folderName: 'Données Comptables',
      version: 'v2.0',
      createdAt: '2024-12-28T10:30:00',
      aiSummary: 'Grand Livre comptable 2024',
    },
    {
      id: '2',
      importId: 'IMP-2024-00090',
      fileName: 'balance_2024.csv',
      fileType: 'csv',
      rowCount: 156,
      columnCount: 8,
      status: 'ready',
      folderId: 'folder-1',
      folderName: 'Données Comptables',
      version: 'v2.0',
      createdAt: '2024-12-28T10:35:00',
      aiSummary: 'Balance comptable 2024',
    },
    {
      id: '3',
      importId: 'IMP-2024-00078',
      fileName: 'ventes_q4_2024.csv',
      fileType: 'csv',
      rowCount: 15420,
      columnCount: 18,
      status: 'ready',
      folderId: 'folder-2',
      folderName: 'Données Commerciales',
      version: 'v1.0',
      createdAt: '2024-12-30T10:30:00',
      aiSummary: 'Données de ventes Q4 avec tendance positive',
    },
    {
      id: '4',
      importId: 'IMP-2024-00079',
      fileName: 'clients_2024.xlsx',
      fileType: 'excel',
      rowCount: 15000,
      columnCount: 24,
      status: 'ready',
      folderId: 'folder-2',
      folderName: 'Données Commerciales',
      version: 'v3.0',
      createdAt: '2024-11-01T14:15:00',
      aiSummary: 'Base clients actualisée',
    },
    {
      id: '5',
      importId: 'IMP-2024-00065',
      fileName: 'effectifs_rh_decembre.csv',
      fileType: 'csv',
      rowCount: 1250,
      columnCount: 15,
      status: 'ready',
      folderId: 'folder-3',
      folderName: 'Données RH',
      version: 'v1.0',
      createdAt: '2024-12-30T16:45:00',
      aiSummary: 'Données RH - effectifs décembre',
    },
    {
      id: '6',
      importId: 'IMP-2024-00102',
      fileName: 'campagnes_marketing_2024.xlsx',
      fileType: 'excel',
      rowCount: 8500,
      columnCount: 24,
      status: 'ready',
      folderId: 'folder-4',
      folderName: 'Données Marketing',
      version: 'v2.1',
      createdAt: '2024-12-29T14:15:00',
      aiSummary: 'Données de campagnes marketing',
    },
  ];

  // Filter imports by selected folder
  const filteredImports = useMemo(() => {
    if (!selectedFolderId) return allAvailableImports;
    return allAvailableImports.filter(imp => imp.folderId === selectedFolderId);
  }, [selectedFolderId]);

  // Get selected imports info
  const selectedImportsInfo = useMemo(() => {
    return allAvailableImports.filter(imp => selectedImportIds.includes(imp.id));
  }, [selectedImportIds]);

  // Mock data - Report templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'sales-analysis',
      name: 'Analyse des Ventes',
      description: 'Rapport complet sur les performances commerciales',
      category: 'Commercial',
      icon: 'trending-up',
      isAI: true,
    },
    {
      id: 'marketing-performance',
      name: 'Performance Marketing',
      description: 'Analyse des campagnes et ROI marketing',
      category: 'Marketing',
      icon: 'target',
      isAI: true,
    },
    {
      id: 'financial-report',
      name: 'Rapport Financier',
      description: 'États financiers et indicateurs clés',
      category: 'Finance',
      icon: 'dollar-sign',
      isAI: true,
    },
    {
      id: 'hr-dashboard',
      name: 'Tableau de Bord RH',
      description: 'Suivi des effectifs et indicateurs RH',
      category: 'RH',
      icon: 'users',
      isAI: true,
    },
    {
      id: 'custom-report',
      name: 'Rapport Personnalisé',
      description: 'L\'IA génère un rapport adapté à vos données',
      category: 'IA',
      icon: 'sparkles',
      isAI: true,
    },
  ];

  // Mock data - Existing reports
  const existingReports: ExistingReport[] = [
    {
      id: 'r1',
      title: 'Rapport Q3 2024 - Ventes',
      reportTypes: ['Analyse des Ventes'],
      createdAt: '2024-10-15',
      version: 2,
    },
    {
      id: 'r2',
      title: 'Bilan Marketing Annuel',
      reportTypes: ['Performance Marketing'],
      createdAt: '2024-12-01',
      version: 1,
    },
  ];

  const toggleImportSelection = (importId: string) => {
    setSelectedImportIds((prev) => {
      if (prev.includes(importId)) {
        return prev.filter((id) => id !== importId);
      }
      return [...prev, importId];
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  };

  const handleGenerate = async () => {
    setCurrentStep('generating');
    setIsGenerating(true);

    // Simulate generation progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setGenerationProgress(i);
    }

    // Navigate to Report Studio
    setTimeout(() => {
      onClose();
      // Pass data via query params or state
      navigate('/reports/demo', {
        state: {
          selectedImports: selectedImportsInfo,
          selectedTemplates: getSelectedTemplatesInfo(),
          period: periodValue,
        }
      });
    }, 500);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'source':
        return selectedImportIds.length > 0 || selectedDataSources.length > 0;
      case 'template':
        return selectedTemplates.length > 0 || selectedExistingReport !== null;
      case 'options':
        return true;
      default:
        return false;
    }
  };

  // Toggle template selection (multi-select)
  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      return [...prev, templateId];
    });
  };

  // Get selected templates info
  const getSelectedTemplatesInfo = () => {
    return selectedTemplates.map(id => reportTemplates.find(t => t.id === id)).filter(Boolean);
  };

  // Get total row count from selected data sources
  const getSelectedDataSourcesInfo = () => {
    return selectedDataSources.map(id => DEFAULT_DATA_SOURCES.find(s => s.id === id)).filter(Boolean);
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'source':
        setCurrentStep('template');
        break;
      case 'template':
        setCurrentStep('options');
        break;
      case 'options':
        handleGenerate();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'template':
        if (preSelectedImports.length === 0) {
          setCurrentStep('source');
        }
        break;
      case 'options':
        setCurrentStep('template');
        break;
    }
  };

  const getStepNumber = () => {
    if (preSelectedImports.length > 0) {
      // Skip source step
      switch (currentStep) {
        case 'template': return 1;
        case 'options': return 2;
        case 'generating': return 3;
        default: return 1;
      }
    }
    switch (currentStep) {
      case 'source': return 1;
      case 'template': return 2;
      case 'options': return 3;
      case 'generating': return 4;
      default: return 1;
    }
  };

  const totalSteps = preSelectedImports.length > 0 ? 3 : 4;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('reports.generate.title', 'Générer un rapport')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('reports.generate.subtitle', 'Étape')} {getStepNumber()}/{totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
            style={{ width: `${(getStepNumber() / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Data Source */}
          {currentStep === 'source' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 mb-4">
                {t('reports.generate.selectDataDesc', 'Sélectionnez les données importées à inclure dans votre rapport.')}
              </p>

              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Dossier
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors bg-white"
                  >
                    <div className="flex items-center gap-3">
                      {selectedFolder ? (
                        <>
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: selectedFolder.color + '20' }}
                          >
                            <Folder className="w-4 h-4" style={{ color: selectedFolder.color }} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{selectedFolder.name}</p>
                            <p className="text-xs text-gray-500">{selectedFolder.importCount} imports</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Database className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Tous les dossiers</p>
                            <p className="text-xs text-gray-500">{totalImportCount} imports</p>
                          </div>
                        </>
                      )}
                    </div>
                    <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showFolderDropdown && 'rotate-180')} />
                  </button>

                  {/* Folder Dropdown */}
                  {showFolderDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowFolderDropdown(false)} />
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        {/* All folders option */}
                        <button
                          onClick={() => {
                            setSelectedFolderId(null);
                            setShowFolderDropdown(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors',
                            !selectedFolderId && 'bg-gray-50'
                          )}
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Database className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-medium text-gray-900">Tous les dossiers</p>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {totalImportCount}
                          </span>
                        </button>

                        <div className="border-t border-gray-100" />

                        {/* Folders */}
                        {dataFolders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => {
                              setSelectedFolderId(folder.id);
                              setShowFolderDropdown(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors',
                              selectedFolderId === folder.id && 'bg-gray-50'
                            )}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: folder.color + '20' }}
                            >
                              <Folder className="w-4 h-4" style={{ color: folder.color }} />
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-medium text-gray-900">{folder.name}</p>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {folder.importCount}
                            </span>
                          </button>
                        ))}

                        <div className="border-t border-gray-100" />

                        {/* New Folder */}
                        {showNewFolderInput ? (
                          <div className="p-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Nom du dossier..."
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateFolder();
                                  if (e.key === 'Escape') setShowNewFolderInput(false);
                                }}
                              />
                              <button
                                onClick={handleCreateFolder}
                                className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                              >
                                Créer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowNewFolderInput(true)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-primary-600"
                          >
                            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                              <FolderPlus className="w-4 h-4" />
                            </div>
                            <span className="font-medium">Nouveau dossier</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Import Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Données importées
                  {selectedImportIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                      {selectedImportIds.length} sélectionné{selectedImportIds.length > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-2">
                  {filteredImports.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucun import dans ce dossier</p>
                    </div>
                  ) : (
                    filteredImports.map((imp) => {
                      const isSelected = selectedImportIds.includes(imp.id);
                      return (
                        <button
                          key={imp.id}
                          onClick={() => toggleImportSelection(imp.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-transparent hover:bg-gray-50'
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                              isSelected
                                ? 'bg-primary-500 border-primary-500'
                                : 'border-gray-300 bg-white'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {/* File icon */}
                          <FileSpreadsheet
                            className={cn(
                              'w-8 h-8 flex-shrink-0',
                              imp.fileType === 'excel' ? 'text-green-600' : 'text-blue-600'
                            )}
                          />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{imp.fileName}</p>
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {imp.version}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {imp.importId} • {imp.rowCount.toLocaleString()} lignes • {imp.aiSummary}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected imports summary */}
              {selectedImportIds.length > 0 && (
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <p className="text-sm text-primary-700">
                    <strong>{selectedImportIds.length}</strong> import{selectedImportIds.length > 1 ? 's' : ''} sélectionné{selectedImportIds.length > 1 ? 's' : ''} -
                    {' '}Total: <strong>{selectedImportsInfo.reduce((acc, imp) => acc + imp.rowCount, 0).toLocaleString()}</strong> lignes
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Template */}
          {currentStep === 'template' && (
            <div className="space-y-6">
              {/* Source Type Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source du modèle
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors bg-white"
                  >
                    <div className="flex items-center gap-3">
                      {templateMode === 'catalog' ? (
                        <>
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <LayoutTemplate className="w-4 h-4 text-primary-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Depuis le catalogue</p>
                            <p className="text-xs text-gray-500">Modèles prédéfinis et optimisés</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Copy className="w-4 h-4 text-primary-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Depuis un rapport existant</p>
                            <p className="text-xs text-gray-500">Réutiliser la structure d'un rapport</p>
                          </div>
                        </>
                      )}
                    </div>
                    <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showSourceDropdown && 'rotate-180')} />
                  </button>

                  {showSourceDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSourceDropdown(false)} />
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <button
                          onClick={() => {
                            setTemplateMode('catalog');
                            setSelectedExistingReport(null);
                            setShowSourceDropdown(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors',
                            templateMode === 'catalog' && 'bg-gray-50'
                          )}
                        >
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <LayoutTemplate className="w-4 h-4 text-primary-600" />
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-medium text-gray-900">Depuis le catalogue</p>
                            <p className="text-xs text-gray-500">Modèles prédéfinis et optimisés par l'IA</p>
                          </div>
                          {templateMode === 'catalog' && <Check className="w-4 h-4 text-primary-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setTemplateMode('existing');
                            setSelectedTemplates([]);
                            setShowSourceDropdown(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors',
                            templateMode === 'existing' && 'bg-gray-50'
                          )}
                        >
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Copy className="w-4 h-4 text-primary-600" />
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-medium text-gray-900">Depuis un rapport existant</p>
                            <p className="text-xs text-gray-500">Réutiliser la structure d'un rapport précédent</p>
                          </div>
                          {templateMode === 'existing' && <Check className="w-4 h-4 text-primary-600" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Template/Report Selection Dropdown */}
              {templateMode === 'catalog' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle de rapport
                    {selectedTemplates.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-primary-600">
                        ({selectedTemplates.length} sélectionné{selectedTemplates.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Sélectionnez un ou plusieurs modèles pour votre rapport
                  </p>

                  {/* Selected templates chips */}
                  {selectedTemplates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getSelectedTemplatesInfo().map((template: any) => (
                        <span
                          key={template.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm"
                        >
                          {template.isAI && <Sparkles className="w-3 h-3" />}
                          {template.name}
                          <button
                            type="button"
                            onClick={() => toggleTemplateSelection(template.id)}
                            className="hover:text-primary-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors bg-white"
                    >
                      <span className="text-gray-500">Sélectionner un modèle...</span>
                      <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showTemplateDropdown && 'rotate-180')} />
                    </button>

                    {showTemplateDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowTemplateDropdown(false)} />
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                          {/* Search */}
                          <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={templateSearchQuery}
                                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                placeholder="Rechercher un modèle..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Template List */}
                          <div className="max-h-64 overflow-y-auto">
                            {reportTemplates
                              .filter(t =>
                                t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                                t.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
                              )
                              .map((template) => {
                                const isSelected = selectedTemplates.includes(template.id);
                                return (
                                  <button
                                    key={template.id}
                                    onClick={() => toggleTemplateSelection(template.id)}
                                    className={cn(
                                      'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0',
                                      isSelected && 'bg-primary-50'
                                    )}
                                  >
                                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      {template.isAI ? (
                                        <Sparkles className="w-5 h-5 text-amber-500" />
                                      ) : (
                                        <LayoutTemplate className="w-5 h-5 text-primary-600" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900">{template.name}</p>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                          {template.category}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-500 truncate">{template.description}</p>
                                    </div>
                                    {isSelected && <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rapport existant
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Choisissez un rapport dont vous souhaitez réutiliser la structure
                  </p>

                  <div className="relative">
                    <button
                      onClick={() => setShowExistingDropdown(!showExistingDropdown)}
                      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors bg-white"
                    >
                      {selectedExistingReport ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">
                              {existingReports.find(r => r.id === selectedExistingReport)?.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              v{existingReports.find(r => r.id === selectedExistingReport)?.version}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Sélectionner un rapport...</span>
                      )}
                      <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showExistingDropdown && 'rotate-180')} />
                    </button>

                    {showExistingDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowExistingDropdown(false)} />
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            {existingReports.map((report) => {
                              const isSelected = selectedExistingReport === report.id;
                              return (
                                <button
                                  key={report.id}
                                  onClick={() => {
                                    setSelectedExistingReport(report.id);
                                    setShowExistingDropdown(false);
                                  }}
                                  className={cn(
                                    'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0',
                                    isSelected && 'bg-primary-50'
                                  )}
                                >
                                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-primary-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{report.title}</p>
                                    <p className="text-sm text-gray-500">
                                      v{report.version} • {report.reportTypes.join(', ')}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Options */}
          {currentStep === 'options' && (
            <div className="space-y-6">
              {/* Summary of selections */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-900">
                  {t('reports.generate.summary', 'Résumé')}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {selectedImportIds.length} import{selectedImportIds.length > 1 ? 's' : ''} sélectionné{selectedImportIds.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {selectedImportIds.length > 0 && (
                    <div className="ml-7 flex flex-wrap gap-2">
                      {selectedImportsInfo.map((imp) => (
                        <span
                          key={imp.id}
                          className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full"
                        >
                          {imp.fileName} ({imp.version})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {templateMode === 'catalog'
                        ? `${selectedTemplates.length} modèle${selectedTemplates.length > 1 ? 's' : ''} sélectionné${selectedTemplates.length > 1 ? 's' : ''}`
                        : existingReports.find((r) => r.id === selectedExistingReport)?.title}
                    </span>
                  </div>
                  {templateMode === 'catalog' && selectedTemplates.length > 0 && (
                    <div className="ml-7 flex flex-wrap gap-2">
                      {getSelectedTemplatesInfo().map((template: any) => (
                        <span
                          key={template.id}
                          className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full"
                        >
                          {template.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Period selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('reports.generate.period', 'Période couverte')}
                </h4>
                <PeriodSelector
                  value={periodValue}
                  onChange={setPeriodValue}
                />
              </div>

              {/* Generation info */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">
                      {t('reports.generate.aiInfo', 'Génération IA dans Report Studio')}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {t(
                        'reports.generate.aiInfoDesc',
                        'Report Studio s\'ouvrira avec vos données et modèles sélectionnés. L\'IA générera le rapport que vous pourrez modifier avant de le soumettre pour validation.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Generating */}
          {currentStep === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-gray-200">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"
                    style={{ animationDuration: '1s' }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('reports.generate.generating', 'Préparation de Report Studio...')}
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {t(
                  'reports.generate.generatingDesc',
                  'Chargement de vos données et modèles. Report Studio s\'ouvrira dans un instant.'
                )}
              </p>
              <div className="w-full max-w-xs mt-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">{generationProgress}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep !== 'generating' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={currentStep === 'source' || (currentStep === 'template' && preSelectedImports.length > 0) ? onClose : handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {currentStep === 'source' || (currentStep === 'template' && preSelectedImports.length > 0) ? (
                t('common.cancel', 'Annuler')
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.back', 'Retour')}
                </>
              )}
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                canProceed()
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {currentStep === 'options' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t('reports.generate.generate', 'Ouvrir Report Studio')}
                </>
              ) : (
                <>
                  {t('common.next', 'Suivant')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateReportModal;
