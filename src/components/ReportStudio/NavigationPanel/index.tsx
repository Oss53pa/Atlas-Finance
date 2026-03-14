import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/utils/cn';
import { Section } from '@/types/reportStudio';
import { SectionItem } from './SectionItem';

interface NavigationPanelProps {
  sections: Section[];
  selectedSectionId: string | null;
  collapsed: boolean;
  onSectionClick: (sectionId: string) => void;
  onReorder: (sections: Section[]) => void;
  onAddSection: (parentId?: string) => void;
  onCollapse: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  sections,
  selectedSectionId,
  collapsed,
  onSectionClick,
  onReorder,
  onAddSection,
  onCollapse,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(sections, oldIndex, newIndex));
      }
    }
  }, [sections, onReorder]);

  const filteredSections = searchQuery
    ? sections.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  const sectionIds = filteredSections.map(s => s.id);

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-primary-200 flex flex-col items-center py-4">
        <button
          onClick={onCollapse}
          className="p-2 hover:bg-primary-100 rounded-lg mb-4"
          title="Développer le panneau"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Mini section indicators */}
        <div className="space-y-2">
          {sections.slice(0, 8).map((section, index) => (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={cn(
                'w-8 h-8 rounded flex items-center justify-center text-xs font-medium',
                selectedSectionId === section.id
                  ? 'bg-primary text-white'
                  : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              )}
              title={section.title}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white border-r border-primary-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-primary-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-primary-900">Plan du document</h2>
          <button
            onClick={onCollapse}
            className="p-1 hover:bg-primary-100 rounded"
            title="Réduire le panneau"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sectionIds}
            strategy={verticalListSortingStrategy}
          >
            {filteredSections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                isSelected={selectedSectionId === section.id}
                isExpanded={expandedSections.has(section.id)}
                depth={0}
                onClick={() => onSectionClick(section.id)}
                onToggleExpand={() => toggleExpand(section.id)}
                onAddChild={() => onAddSection(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {filteredSections.length === 0 && (
          <div className="text-center py-8 text-primary-500">
            {searchQuery ? (
              <p>Aucune section trouvée</p>
            ) : (
              <p>Aucune section</p>
            )}
          </div>
        )}
      </div>

      {/* Add section button */}
      <div className="p-4 border-t border-primary-200">
        <button
          onClick={() => onAddSection()}
          className="w-full px-4 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une section
        </button>
      </div>
    </div>
  );
};
