/**
 * VersionComparison - Comparaison de versions avec diff visuel
 * Permet de voir les différences entre deux versions du rapport
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import {
  GitCompare,
  ChevronDown,
  Plus,
  Minus,
  Edit3,
  ArrowRight,
  Eye,
  Download,
  RotateCcw,
  FileText,
  Clock,
  User,
  Filter,
  X,
  ChevronsUpDown,
} from 'lucide-react';

export interface ReportVersion {
  id: string;
  version: string;
  label: string;
  author: {
    name: string;
    initials: string;
  };
  timestamp: string;
  changes: {
    added: number;
    modified: number;
    removed: number;
  };
  sections: VersionSection[];
}

export interface VersionSection {
  id: string;
  title: string;
  status: 'unchanged' | 'added' | 'modified' | 'removed';
  contentOld?: string;
  contentNew?: string;
  blocks: VersionBlock[];
}

export interface VersionBlock {
  id: string;
  type: string;
  status: 'unchanged' | 'added' | 'modified' | 'removed';
  contentOld?: string;
  contentNew?: string;
  changes?: BlockChange[];
}

export interface BlockChange {
  type: 'text' | 'value' | 'style' | 'data';
  field: string;
  oldValue: string;
  newValue: string;
}

interface VersionComparisonProps {
  versions: ReportVersion[];
  currentVersionId?: string;
  onRestore: (versionId: string) => void;
  onExportDiff?: () => void;
  onExport?: (versionId: string) => void;
  onClose: () => void;
  className?: string;
}

export const VersionComparison: React.FC<VersionComparisonProps> = ({
  versions,
  currentVersionId,
  onRestore,
  onExportDiff,
  onExport,
  onClose,
  className,
}) => {
  const [leftVersion, setLeftVersion] = useState(versions[1]?.id || '');
  const [rightVersion, setRightVersion] = useState(versions[0]?.id || '');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [filterStatus, setFilterStatus] = useState<'all' | 'added' | 'modified' | 'removed'>('all');

  const leftVersionData = versions.find(v => v.id === leftVersion);
  const rightVersionData = versions.find(v => v.id === rightVersion);

  const filteredSections = useMemo(() => {
    if (!rightVersionData) return [];
    return rightVersionData.sections.filter(section => {
      if (filterStatus === 'all') return true;
      return section.status === filterStatus;
    });
  }, [rightVersionData, filterStatus]);

  // Expand all sections by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    if (versions[0]?.sections) {
      versions[0].sections.forEach(s => initialExpanded.add(s.id));
    }
    return initialExpanded;
  });

  // Update expanded sections when version changes
  React.useEffect(() => {
    if (rightVersionData?.sections) {
      const allSectionIds = new Set(rightVersionData.sections.map(s => s.id));
      setExpandedSections(allSectionIds);
    }
  }, [rightVersion, rightVersionData]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'added':
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Ajouté
          </span>
        );
      case 'modified':
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Modifié
          </span>
        );
      case 'removed':
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
            <Minus className="w-3 h-3" />
            Supprimé
          </span>
        );
      default:
        return null;
    }
  };

  const renderDiffText = (oldText: string, newText: string) => {
    // Simple word-level diff visualization
    const oldWords = oldText?.split(' ') || [];
    const newWords = newText?.split(' ') || [];

    return (
      <div className="space-y-2">
        {viewMode === 'side-by-side' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Ancienne version</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {oldWords.map((word, i) => (
                  <span
                    key={i}
                    className={cn(
                      !newWords.includes(word) && 'bg-gray-300 line-through'
                    )}
                  >
                    {word}{' '}
                  </span>
                ))}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Nouvelle version</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {newWords.map((word, i) => (
                  <span
                    key={i}
                    className={cn(
                      !oldWords.includes(word) && 'bg-primary-100 font-medium'
                    )}
                  >
                    {word}{' '}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {newWords.map((word, i) => {
                const isAdded = !oldWords.includes(word);
                const wasRemoved = oldWords[i] && !newWords.includes(oldWords[i]);
                return (
                  <React.Fragment key={i}>
                    {wasRemoved && (
                      <span className="bg-gray-300 line-through text-gray-500">{oldWords[i]} </span>
                    )}
                    <span className={cn(isAdded && 'bg-primary-100 font-medium')}>
                      {word}{' '}
                    </span>
                  </React.Fragment>
                );
              })}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Comparaison de versions
            </h3>
            <p className="text-sm text-purple-200 mt-1">Voir les différences entre deux versions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  viewMode === 'side-by-side' ? 'bg-white/20' : 'hover:bg-white/10'
                )}
              >
                Côte à côte
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  viewMode === 'unified' ? 'bg-white/20' : 'hover:bg-white/10'
                )}
              >
                Unifié
              </button>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Version Selectors */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Left Version */}
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Version de base</label>
            <div className="relative">
              <select
                value={leftVersion}
                onChange={(e) => setLeftVersion(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg appearance-none pr-10"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} - {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {leftVersionData && (
              <p className="text-xs text-gray-500 mt-1">
                Par {leftVersionData.author.name} • {leftVersionData.timestamp}
              </p>
            )}
          </div>

          <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />

          {/* Right Version */}
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Version à comparer</label>
            <div className="relative">
              <select
                value={rightVersion}
                onChange={(e) => setRightVersion(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg appearance-none pr-10"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} - {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {rightVersionData && (
              <p className="text-xs text-gray-500 mt-1">
                Par {rightVersionData.author.name} • {rightVersionData.timestamp}
              </p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {rightVersionData && (
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-700">{rightVersionData.changes.added}</p>
                <p className="text-xs text-gray-500">Ajouts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-700">{rightVersionData.changes.modified}</p>
                <p className="text-xs text-gray-500">Modifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Minus className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-700">{rightVersionData.changes.removed}</p>
                <p className="text-xs text-gray-500">Suppressions</p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1">
                <Filter className="w-4 h-4" />
                Filtrer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tout', count: rightVersionData?.sections?.length || 0 },
            { id: 'added', label: 'Ajoutés', count: rightVersionData?.sections?.filter(s => s.status === 'added').length || 0 },
            { id: 'modified', label: 'Modifiés', count: rightVersionData?.sections?.filter(s => s.status === 'modified').length || 0 },
            { id: 'removed', label: 'Supprimés', count: rightVersionData?.sections?.filter(s => s.status === 'removed').length || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1',
                filterStatus === tab.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                filterStatus === tab.id ? 'bg-white/20' : 'bg-gray-200'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Expand/Collapse All button */}
        <button
          onClick={() => {
            if (expandedSections.size === filteredSections.length) {
              setExpandedSections(new Set());
            } else {
              setExpandedSections(new Set(filteredSections.map(s => s.id)));
            }
          }}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
        >
          <ChevronsUpDown className="w-4 h-4" />
          {expandedSections.size === filteredSections.length ? 'Tout replier' : 'Tout déplier'}
        </button>
      </div>

      {/* Diff Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
        {filteredSections.map((section) => (
          <div
            key={section.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">{section.title}</span>
                {getStatusBadge(section.status)}
              </div>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400 transition-transform',
                  expandedSections.has(section.id) && 'rotate-180'
                )}
              />
            </button>

            {/* Section Content */}
            {expandedSections.has(section.id) && (
              <div className="p-4 space-y-4">
                {section.blocks.map((block) => (
                  <div key={block.id} className="border-l-4 pl-4 border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">{block.type}</span>
                      {getStatusBadge(block.status)}
                    </div>

                    {block.status === 'modified' && block.contentOld && block.contentNew && (
                      renderDiffText(block.contentOld, block.contentNew)
                    )}

                    {block.status === 'added' && block.contentNew && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">{block.contentNew}</p>
                      </div>
                    )}

                    {block.status === 'removed' && block.contentOld && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 line-through">{block.contentOld}</p>
                      </div>
                    )}

                    {/* Detailed Changes */}
                    {block.changes && block.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {block.changes.map((change, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">{change.field}:</span>
                            <span className="px-1 bg-gray-200 text-gray-500 line-through">{change.oldValue}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="px-1 bg-primary-100 text-gray-700 font-medium">{change.newValue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune différence trouvée pour ce filtre</p>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 border border-gray-300"
          >
            <X className="w-4 h-4" />
            Fermer
          </button>
          <button
            onClick={() => leftVersionData && onRestore(leftVersionData.id)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurer {leftVersionData?.version}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onExportDiff ? onExportDiff() : (rightVersionData && onExport?.(rightVersionData.id))}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter le diff
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Voir version complète
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionComparison;
