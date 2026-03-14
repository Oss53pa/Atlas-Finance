import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { ContentBlock, BlockType, Section, ExportFormat } from '@/types/reportStudio';
import { useReportStudioStore } from '@/stores/reportStudioStore';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { useReviewStore } from '@/stores/reviewStore';
import { ReportHeader } from './ReportHeader';
import { NavigationPanel } from './NavigationPanel';
import { DocumentCanvas } from './DocumentCanvas';
import { AIPanel } from './AIPanel';
import { DocumentInfoPanel } from './Panels/DocumentInfoPanel';
import { FloatingToolbar } from './Toolbar/FloatingToolbar';
import { ExportModal } from './Modals/ExportModal';
import { ChartEditorModal } from './Modals/ChartEditorModal';
import ShareReportModal from './Modals/ShareReportModal';
import { ReportDesignEditor } from './Design';
import { ReviewDialog } from '@/components/reviews';
import { mockDocumentInfo } from '@/data/mockReportStudioData';
import { VersionComparison } from './Collaboration/VersionComparison';
import type { ReportVersion } from './Collaboration/VersionComparison';
import { ReportManagementModal } from '@/components/modals';

interface ReportStudioProps {
  className?: string;
}

type RightPanelView = 'ai' | 'document';

const ReportStudio: React.FC<ReportStudioProps> = ({ className }) => {
  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDesignEditor, setShowDesignEditor] = useState(false);
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Right panel state
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('ai');
  const [documentInfoCollapsed, setDocumentInfoCollapsed] = useState(false);

  // Review store
  const { submitForReview, isSubmitting: isSubmittingReview } = useReviewStore();

  // Design store
  const { settings: designSettings, loadSettings: loadDesignSettings } = useReportDesignStore();

  // Get state and actions from Zustand store
  const {
    report,
    content,
    editor,
    ui,
    // Actions
    selectSection,
    selectBlock,
    setEditing,
    reorderSections,
    addSection,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    duplicateBlock,
    setSaving,
    markAsSaved,
    toggleSidebar,
    toggleAIPanel,
    setZoomLevel,
    undo,
    redo,
    canUndo,
    canRedo,
    addChatMessage,
    setAILoading,
    updateDesignSettings,
  } = useReportStudioStore();

  // Create new block helper
  const createBlock = useCallback((type: BlockType): ContentBlock => {
    const id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const baseBlock = { id, type };

    switch (type) {
      case 'paragraph':
        return { ...baseBlock, type: 'paragraph', content: 'Nouveau paragraphe. Double-cliquez pour éditer.' };
      case 'heading':
        return { ...baseBlock, type: 'heading', content: 'Nouveau titre', level: 2 };
      case 'list':
        return {
          ...baseBlock,
          type: 'list',
          listType: 'bullet',
          items: [
            { id: 'item-1', content: 'Premier élément' },
            { id: 'item-2', content: 'Deuxième élément' },
            { id: 'item-3', content: 'Troisième élément' },
          ],
        };
      case 'chart':
        return {
          ...baseBlock,
          type: 'chart',
          chartType: 'bar',
          data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr'],
            datasets: [{
              label: 'Données',
              data: [400, 300, 600, 800],
              backgroundColor: '#1C3163',
            }],
          },
          config: {
            title: 'Nouveau graphique',
            colorScheme: 'corporate',
            legend: { show: true, position: 'top' },
          },
        };
      case 'table':
        return {
          ...baseBlock,
          type: 'table',
          headers: [
            { id: 'h1', label: 'Colonne 1', key: 'col1' },
            { id: 'h2', label: 'Colonne 2', key: 'col2' },
            { id: 'h3', label: 'Colonne 3', key: 'col3' },
          ],
          rows: [
            { col1: { value: 'Valeur 1' }, col2: { value: 'Valeur 2' }, col3: { value: 'Valeur 3' } },
            { col1: { value: 'Valeur 4' }, col2: { value: 'Valeur 5' }, col3: { value: 'Valeur 6' } },
          ],
          config: { striped: true, bordered: true },
        };
      case 'image':
        return {
          ...baseBlock,
          type: 'image',
          src: 'https://via.placeholder.com/800x400?text=Image',
          alt: 'Image placeholder',
          caption: 'Légende de l\'image',
        };
      case 'callout':
        return {
          ...baseBlock,
          type: 'callout',
          variant: 'info',
          title: 'Information importante',
          content: 'Contenu de l\'encadré. Cliquez pour modifier.',
          icon: 'lightbulb',
        };
      case 'quote':
        return {
          ...baseBlock,
          type: 'callout',
          variant: 'default',
          content: 'Citation à modifier...',
          icon: 'quote',
        };
      case 'divider':
        return { ...baseBlock, type: 'divider', style: 'solid' };
      case 'pagebreak':
        return { ...baseBlock, type: 'pagebreak' };
      default:
        return { ...baseBlock, type: 'paragraph', content: 'Nouveau bloc' };
    }
  }, []);

  // Handlers
  const handleSectionClick = useCallback((sectionId: string) => {
    selectSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectSection]);

  const handleSectionReorder = useCallback((sections: Section[]) => {
    // Find start and end indices for the reorder
    const oldSections = content.sections;
    const movedSection = sections.find((s, i) => oldSections[i]?.id !== s.id);
    if (movedSection) {
      const startIndex = oldSections.findIndex(s => s.id === movedSection.id);
      const endIndex = sections.findIndex(s => s.id === movedSection.id);
      if (startIndex !== -1 && endIndex !== -1) {
        reorderSections(startIndex, endIndex);
      }
    }
  }, [content.sections, reorderSections]);

  const handleAddSection = useCallback((parentId?: string) => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      type: 'section',
      title: 'Nouvelle section',
      level: 1,
      status: 'manual',
      isLocked: false,
      isCollapsed: false,
      children: [],
      blocks: [
        {
          id: `block-${Date.now()}`,
          type: 'paragraph',
          content: 'Contenu de la nouvelle section...',
        },
      ],
    };
    addSection(newSection, parentId);
  }, [addSection]);

  const handleInsert = useCallback((type: BlockType, afterBlockId?: string) => {
    if (!editor.selectedSectionId && content.sections.length > 0) {
      selectSection(content.sections[0].id);
    }

    const sectionId = editor.selectedSectionId || content.sections[0]?.id;
    if (!sectionId) return;

    const newBlock = createBlock(type);
    addBlock(sectionId, newBlock, afterBlockId);
    selectBlock(newBlock.id);

    // Open chart editor for new charts
    if (type === 'chart') {
      setEditingChartId(newBlock.id);
      setShowChartEditor(true);
    }
  }, [editor.selectedSectionId, content.sections, createBlock, addBlock, selectBlock, selectSection]);

  const handleContentChange = useCallback((blockId: string, updates: Partial<ContentBlock>) => {
    const section = content.sections.find(s =>
      s.blocks.some(b => b.id === blockId) ||
      s.children?.some(c => c.blocks?.some(b => b.id === blockId))
    );
    if (section) {
      updateBlock(section.id, blockId, updates);
    }
  }, [content.sections, updateBlock]);

  const handleBlockSelect = useCallback((blockId: string | null) => {
    selectBlock(blockId);
  }, [selectBlock]);

  const handleDelete = useCallback(() => {
    if (!editor.selectedBlockId) return;
    const section = content.sections.find(s =>
      s.blocks.some(b => b.id === editor.selectedBlockId)
    );
    if (section) {
      deleteBlock(section.id, editor.selectedBlockId);
      selectBlock(null);
    }
  }, [editor.selectedBlockId, content.sections, deleteBlock, selectBlock]);

  const handleDuplicate = useCallback(() => {
    if (!editor.selectedBlockId) return;
    const section = content.sections.find(s =>
      s.blocks.some(b => b.id === editor.selectedBlockId)
    );
    if (section) {
      duplicateBlock(section.id, editor.selectedBlockId);
    }
  }, [editor.selectedBlockId, content.sections, duplicateBlock]);

  const handleMoveUp = useCallback(() => {
    if (!editor.selectedBlockId) return;
    const section = content.sections.find(s =>
      s.blocks.some(b => b.id === editor.selectedBlockId)
    );
    if (section) {
      const blockIndex = section.blocks.findIndex(b => b.id === editor.selectedBlockId);
      if (blockIndex > 0) {
        moveBlock(section.id, editor.selectedBlockId, section.id, blockIndex - 1);
      }
    }
  }, [editor.selectedBlockId, content.sections, moveBlock]);

  const handleMoveDown = useCallback(() => {
    if (!editor.selectedBlockId) return;
    const section = content.sections.find(s =>
      s.blocks.some(b => b.id === editor.selectedBlockId)
    );
    if (section) {
      const blockIndex = section.blocks.findIndex(b => b.id === editor.selectedBlockId);
      if (blockIndex < section.blocks.length - 1) {
        moveBlock(section.id, editor.selectedBlockId, section.id, blockIndex + 1);
      }
    }
  }, [editor.selectedBlockId, content.sections, moveBlock]);

  const handleSave = useCallback(async () => {
    if (!report || !content) return;
    setSaving(true);
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      markAsSaved();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [report, content, setSaving, markAsSaved]);

  // Open save modal for full cataloging
  const handleSaveWithMetadata = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  // Handle save from modal
  const handleSaveModalSubmit = useCallback(async (data: any) => {
    console.log('Save report with metadata:', data);
    setSaving(true);
    try {
      // TODO: API call to save report with full metadata
      await new Promise(resolve => setTimeout(resolve, 1000));
      markAsSaved();
      setShowSaveModal(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [setSaving, markAsSaved]);

  const handleExport = useCallback((format: ExportFormat) => {
    setShowExportModal(true);
  }, []);

  const handleExportConfirm = useCallback(async (format: ExportFormat, options: any) => {
    console.log('Exporting:', format, options);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert(`Export ${format.toUpperCase()} réussi ! (simulation)`);
    setShowExportModal(false);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, [setZoomLevel]);

  const handleModeToggle = useCallback(() => {
    setEditing(!editor.isEditing);
  }, [editor.isEditing, setEditing]);

  const handleAIAction = useCallback(async (action: { type: string; data: any }) => {
    console.log('AI Action:', action);
  }, []);

  const handleInsertFromAI = useCallback((block: ContentBlock) => {
    if (editor.selectedSectionId) {
      addBlock(editor.selectedSectionId, block);
    }
  }, [editor.selectedSectionId, addBlock]);

  const handleChartSave = useCallback((chartData: any) => {
    if (editingChartId) {
      const section = content.sections.find(s =>
        s.blocks.some(b => b.id === editingChartId)
      );
      if (section) {
        updateBlock(section.id, editingChartId, {
          chartType: chartData.chartType,
          data: {
            labels: chartData.data.map((d: any) => d.label),
            datasets: [{
              label: chartData.title,
              data: chartData.data.map((d: any) => d.value),
              backgroundColor: '#1C3163',
            }],
          },
          config: {
            title: chartData.title,
            ...chartData.config,
          },
        });
      }
    }
    setShowChartEditor(false);
    setEditingChartId(null);
  }, [editingChartId, content.sections, updateBlock]);

  // Document action handler
  const handleDocumentAction = useCallback((action: string, data?: any) => {
    console.log('Document action:', action, data);
    switch (action) {
      case 'translate':
        alert('Traduction automatique en cours... (simulation)');
        break;
      case 'download':
        setShowExportModal(true);
        break;
      case 'share':
        setShowShareModal(true);
        break;
      case 'design':
        handleOpenDesignEditor();
        break;
      case 'print':
        window.print();
        break;
      case 'lock':
        alert('Document verrouillé (simulation)');
        break;
      case 'delete':
        if (confirm('Voulez-vous vraiment supprimer ce document ?')) {
          alert('Document supprimé (simulation)');
        }
        break;
      case 'compareVersions':
      case 'compareWithCurrent':
        setShowVersionComparison(true);
        break;
      case 'viewVersion':
        alert(`Visualisation de la version ${data?.version}... (simulation)`);
        break;
      case 'restoreVersion':
        if (confirm(`Voulez-vous restaurer la version ${data?.version} ?`)) {
          alert(`Version ${data?.version} restaurée ! (simulation)`);
        }
        break;
      case 'addNote':
        alert('Mode annotation note activé (simulation)');
        break;
      case 'highlight':
        alert('Mode surlignage activé (simulation)');
        break;
      case 'annotate':
        alert('Mode annotation activé (simulation)');
        break;
      default:
        console.log('Unhandled document action:', action);
    }
  }, []);

  // Handle design editor open
  const handleOpenDesignEditor = useCallback(() => {
    // Load current design settings from report into design store
    if (report?.designSettings) {
      loadDesignSettings(report.designSettings);
    }
    setShowDesignEditor(true);
  }, [report, loadDesignSettings]);

  // Handle design settings save
  const handleSaveDesignSettings = useCallback(() => {
    // Save design settings from design store to report
    updateDesignSettings(designSettings);
    setShowDesignEditor(false);
  }, [designSettings, updateDesignSettings]);

  // Handle submit for review
  const handleSubmitForReviewClick = useCallback(() => {
    console.log('Submit for review clicked, showReviewDialog will be:', true);
    setShowReviewDialog(true);
  }, []);

  const handleSubmitForReview = useCallback(async (data: { priority?: string; message?: string; reviewer_id?: string; due_date?: string }) => {
    if (!report) return;
    try {
      await submitForReview(report.id, data as Parameters<typeof submitForReview>[1]);
      setShowReviewDialog(false);
      // Optionally refresh the report to show new status
    } catch (error) {
      console.error('Failed to submit for review:', error);
    }
  }, [report, submitForReview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (canUndo()) undo();
            break;
          case 'y':
            e.preventDefault();
            if (canRedo()) redo();
            break;
          case 'd':
            e.preventDefault();
            handleDuplicate();
            break;
        }
      }
      if (e.key === 'Delete' && editor.selectedBlockId) {
        handleDelete();
      }
      if (e.key === 'Escape') {
        handleBlockSelect(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleBlockSelect, handleDelete, handleDuplicate, undo, redo, canUndo, canRedo, editor.selectedBlockId]);

  // No report loaded state
  if (!report) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-screen bg-gray-100', className)}>
      {/* Header */}
      <ReportHeader
        report={report}
        mode={editor.isEditing ? 'edit' : 'view'}
        hasUnsavedChanges={ui.hasUnsavedChanges}
        isSaving={ui.isSaving}
        zoom={editor.zoomLevel}
        onSave={handleSave}
        onSaveWithMetadata={handleSaveWithMetadata}
        onExport={handleExport}
        onZoomChange={handleZoomChange}
        onModeToggle={handleModeToggle}
        onSubmitForReview={handleSubmitForReviewClick}
        isSubmittingReview={isSubmittingReview}
        onOpenDesign={handleOpenDesignEditor}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Panel (Left) */}
        <NavigationPanel
          sections={content.sections}
          selectedSectionId={editor.selectedSectionId}
          collapsed={ui.sidebarCollapsed}
          onSectionClick={handleSectionClick}
          onReorder={handleSectionReorder}
          onAddSection={handleAddSection}
          onCollapse={toggleSidebar}
        />

        {/* Document Canvas (Center) */}
        <DocumentCanvas
          content={{ contentTree: content }}
          mode={editor.isEditing ? 'edit' : 'view'}
          zoom={editor.zoomLevel}
          viewMode="continuous"
          selectedBlockId={editor.selectedBlockId}
          onContentChange={handleContentChange}
          onBlockSelect={handleBlockSelect}
          onSelectionChange={() => {}}
        >
          {/* Floating Toolbar for edit mode */}
          {editor.isEditing && (
            <FloatingToolbar
              visible={true}
              selectedBlockId={editor.selectedBlockId}
              onInsert={handleInsert}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          )}
        </DocumentCanvas>

        {/* Right Side Panel */}
        <DocumentInfoPanel
          document={mockDocumentInfo}
          collapsed={documentInfoCollapsed}
          onCollapse={() => setDocumentInfoCollapsed(!documentInfoCollapsed)}
          onAction={handleDocumentAction}
          aiPanel={
            <AIPanel
              report={report}
              selectedText={null}
              selectedBlockId={editor.selectedBlockId}
              collapsed={ui.aiPanelCollapsed}
              onInsertContent={handleInsertFromAI}
              onAction={handleAIAction}
              onCollapse={toggleAIPanel}
            />
          }
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        reportTitle={report.title}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
      />

      {/* Chart Editor Modal */}
      <ChartEditorModal
        isOpen={showChartEditor}
        onClose={() => {
          setShowChartEditor(false);
          setEditingChartId(null);
        }}
        onSave={handleChartSave}
      />

      {/* Submit for Review Dialog */}
      <ReviewDialog
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        mode="submit"
        reportTitle={report.title}
        onSubmit={handleSubmitForReview}
        isLoading={isSubmittingReview}
      />

      {/* Share Report Modal */}
      <ShareReportModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        reportId={report.id}
        reportTitle={report.title}
      />

      {/* Report Design Editor */}
      <ReportDesignEditor
        isOpen={showDesignEditor}
        onClose={() => setShowDesignEditor(false)}
        onSave={handleSaveDesignSettings}
      />

      {/* Version Comparison Modal */}
      {showVersionComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <VersionComparison
              versions={mockVersions}
              currentVersionId="v2.1"
              onRestore={(versionId) => {
                alert(`Restauration de la version ${versionId}...`);
                setShowVersionComparison(false);
              }}
              onExportDiff={() => alert('Export du diff...')}
              onClose={() => setShowVersionComparison(false)}
            />
          </div>
        </div>
      )}

      {/* Report Management Modal (Save with metadata & workflow) */}
      <ReportManagementModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSubmit={handleSaveModalSubmit}
        reportName={report.title}
      />
    </div>
  );
};

// Mock data for version comparison
const mockVersions: ReportVersion[] = [
  {
    id: 'v2.1',
    version: 'v2.1',
    label: 'Version actuelle',
    author: { name: 'Kouamé Yao', initials: 'KY' },
    timestamp: '28 Déc 2024, 14:30',
    changes: { added: 1, modified: 2, removed: 0 },
    sections: [
      {
        id: 's1',
        title: 'Résumé exécutif',
        status: 'modified',
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            status: 'modified',
            contentOld: 'Le marché africain du cacao montre une croissance de 10.2% par rapport à l\'année précédente. Carrefour reste en tête avec 17.8% de part de marché.',
            contentNew: 'Le marché africain du cacao continue de montrer une croissance soutenue avec une augmentation de 12.5% par rapport à l\'année précédente. Les principaux acteurs maintiennent leurs positions avec Carrefour en tête à 18.2% de part de marché.',
          },
          {
            id: 'b2',
            type: 'kpi',
            status: 'modified',
            contentOld: 'Croissance: +10.2% | Part de marché: 17.8%',
            contentNew: 'Croissance: +12.5% | Part de marché: 18.2%',
            changes: [
              { type: 'value', field: 'Croissance', oldValue: '+10.2%', newValue: '+12.5%' },
              { type: 'value', field: 'Part de marché', oldValue: '17.8%', newValue: '18.2%' },
            ],
          },
        ],
      },
      {
        id: 's2',
        title: 'Analyse des tendances',
        status: 'modified',
        blocks: [
          {
            id: 'b3',
            type: 'paragraph',
            status: 'modified',
            contentOld: 'Les tendances du Q3 2024 montrent une dynamique positive avec des volumes en hausse de 6.5%.',
            contentNew: 'Les tendances observées au Q4 2024 confirment la dynamique positive du secteur avec des volumes en hausse de 8.3% et une amélioration des marges de 2.1 points.',
          },
          {
            id: 'b4',
            type: 'chart',
            status: 'unchanged',
            contentNew: 'Graphique: Évolution trimestrielle',
          },
        ],
      },
      {
        id: 's3',
        title: 'Recommandations',
        status: 'added',
        blocks: [
          {
            id: 'b5',
            type: 'paragraph',
            status: 'added',
            contentNew: 'Sur la base de notre analyse, nous recommandons de renforcer la présence sur les marchés émergents d\'Afrique de l\'Ouest et d\'accélérer la transformation digitale.',
          },
        ],
      },
    ],
  },
  {
    id: 'v2.0',
    version: 'v2.0',
    label: 'Révision majeure',
    author: { name: 'Aminata Diallo', initials: 'AD' },
    timestamp: '20 Déc 2024, 10:15',
    changes: { added: 2, modified: 3, removed: 1 },
    sections: [
      {
        id: 's1',
        title: 'Résumé exécutif',
        status: 'modified',
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            status: 'modified',
            contentOld: 'Mise à jour des données Q3 2024. Le marché continue sa progression.',
            contentNew: 'Le marché africain du cacao montre une croissance de 10.2% par rapport à l\'année précédente. Carrefour reste en tête avec 17.8% de part de marché.',
          },
          {
            id: 'b2',
            type: 'kpi',
            status: 'added',
            contentNew: 'Croissance: +10.2% | Part de marché: 17.8%',
          },
        ],
      },
      {
        id: 's2',
        title: 'Analyse des tendances',
        status: 'added',
        blocks: [
          {
            id: 'b3',
            type: 'paragraph',
            status: 'added',
            contentNew: 'Les tendances du Q3 2024 montrent une dynamique positive avec des volumes en hausse de 6.5%.',
          },
          {
            id: 'b4',
            type: 'chart',
            status: 'added',
            contentNew: 'Graphique: Évolution trimestrielle',
          },
        ],
      },
    ],
  },
  {
    id: 'v1.5',
    version: 'v1.5',
    label: 'Mise à jour données',
    author: { name: 'Kouamé Yao', initials: 'KY' },
    timestamp: '15 Déc 2024, 16:45',
    changes: { added: 1, modified: 2, removed: 0 },
    sections: [
      {
        id: 's1',
        title: 'Résumé exécutif',
        status: 'modified',
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            status: 'modified',
            contentOld: 'Document initial créé pour le rapport sur le marché du cacao.',
            contentNew: 'Mise à jour des données Q3 2024. Le marché continue sa progression.',
          },
        ],
      },
    ],
  },
  {
    id: 'v1.0',
    version: 'v1.0',
    label: 'Version initiale',
    author: { name: 'Kouamé Yao', initials: 'KY' },
    timestamp: '1 Déc 2024, 09:00',
    changes: { added: 5, modified: 0, removed: 0 },
    sections: [
      {
        id: 's1',
        title: 'Introduction',
        status: 'added',
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            status: 'added',
            contentNew: 'Document initial créé pour le rapport sur le marché du cacao.',
          },
        ],
      },
    ],
  },
];

export default ReportStudio;
