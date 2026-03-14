import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/utils/cn';
import { Section, ContentBlock } from '@/types/reportStudio';
import { BlockRenderer } from '../BlockRenderers';
import { DraggableBlock } from '../DragDrop/DraggableBlock';
import {
  FileText,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  GripVertical,
  MoreVertical,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Map icon names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  'clipboard-list': ClipboardList,
  'bar-chart-3': BarChart3,
  'trending-up': TrendingUp,
  'lightbulb': Lightbulb,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  'file-text': FileText,
};

// Get icon component from name
const getIcon = (iconName?: string): React.ElementType | null => {
  if (!iconName) return null;
  return iconMap[iconName] || null;
};

interface SectionRendererProps {
  section: Section;
  isEditable: boolean;
  isFirst: boolean;
  selectedBlockId: string | null;
  onBlockSelect: (blockId: string | null) => void;
  onBlockChange: (blockId: string, updates: Partial<ContentBlock>) => void;
  onBlockDuplicate?: (sectionId: string, blockId: string) => void;
  onBlockDelete?: (sectionId: string, blockId: string) => void;
  onAddBlock?: (sectionId: string) => void;
  onDragStart?: (e: React.DragEvent, blockId: string, blockType: string) => void;
  onDrop?: (e: React.DragEvent, targetId: string, position: 'before' | 'after') => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  isEditable,
  isFirst,
  selectedBlockId,
  onBlockSelect,
  onBlockChange,
  onBlockDuplicate,
  onBlockDelete,
  onAddBlock,
  onDragStart,
  onDrop,
  onDragOver,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(section.isCollapsed || false);

  const headingLevelClasses = {
    1: 'text-2xl font-bold mt-8 mb-4',
    2: 'text-xl font-semibold mt-6 mb-3',
    3: 'text-lg font-medium mt-4 mb-2',
    4: 'text-base font-medium mt-3 mb-2',
  };

  const IconComponent = getIcon(section.icon);

  // Use sortable for section drag & drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `section-${section.id}`,
    data: {
      type: 'section',
      section,
    },
    disabled: !isEditable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      id={`section-${section.id}`}
      className={cn(
        'relative',
        !isFirst && 'mt-8',
        section.isLocked && 'pointer-events-none opacity-70',
        isDragging && 'z-50'
      )}
    >
      {/* Section header */}
      <div className="group relative">
        <div
          className={cn(
            'flex items-center gap-2',
            headingLevelClasses[section.level as keyof typeof headingLevelClasses] || headingLevelClasses[1],
            'text-primary-900',
            isEditable && 'hover:bg-primary-50 rounded px-2 -mx-2 cursor-pointer'
          )}
          onClick={() => isEditable && setIsCollapsed(!isCollapsed)}
        >
          {/* Collapse/Expand icon */}
          {isEditable && (
            <button
              className="p-0.5 hover:bg-primary-100 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-primary-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-primary-400" />
              )}
            </button>
          )}

          {IconComponent && <IconComponent className="w-5 h-5 text-gray-500" />}
          <span className="flex-1">{section.title}</span>

          {/* Block count badge */}
          {isCollapsed && section.blocks.length > 0 && (
            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
              {section.blocks.length} bloc{section.blocks.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Section actions (visible on hover in edit mode) */}
        {isEditable && (
          <div
            className={cn(
              'absolute -left-14 top-1/2 -translate-y-1/2 flex items-center gap-1',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <button
              {...attributes}
              {...listeners}
              className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-grab active:cursor-grabbing"
              title="Deplacer la section"
            >
              <GripVertical className="w-4 h-4 text-primary-500" />
            </button>
            <button
              className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
              title="Options de section"
            >
              <MoreVertical className="w-4 h-4 text-primary-500" />
            </button>
          </div>
        )}

        {/* Section status indicator */}
        {section.metadata?.completionStatus && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            {section.metadata.completionStatus === 'complete' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Complet
              </span>
            )}
            {section.metadata.completionStatus === 'draft' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                Brouillon
              </span>
            )}
            {section.metadata.completionStatus === 'needs_review' && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                A revoir
              </span>
            )}
          </div>
        )}
      </div>

      {/* Section blocks */}
      {!isCollapsed && (
        <div className="space-y-4 mt-4">
          {section.blocks.map((block) => (
            <DraggableBlock
              key={block.id}
              id={`block-${block.id}`}
              block={block}
              sectionId={section.id}
              isEditable={isEditable}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onBlockSelect(block.id)}
              onDuplicate={onBlockDuplicate ? () => onBlockDuplicate(section.id, block.id) : undefined}
              onDelete={onBlockDelete ? () => onBlockDelete(section.id, block.id) : undefined}
            >
              <BlockRenderer
                block={block}
                isEditable={isEditable}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onBlockSelect(block.id)}
                onChange={(updates) => onBlockChange(block.id, updates)}
                onDragStart={(e) => onDragStart?.(e, block.id, block.type)}
                onDrop={(e, position) => onDrop?.(e, block.id, position)}
                onDragOver={(e) => onDragOver?.(e)}
              />
            </DraggableBlock>
          ))}

          {/* Empty state */}
          {section.blocks.length === 0 && isEditable && (
            <div className="py-8 border-2 border-dashed border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-400 mb-2">Cette section est vide</p>
              <button
                onClick={() => onAddBlock?.(section.id)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Ajouter un bloc
              </button>
            </div>
          )}
        </div>
      )}

      {/* Children sections */}
      {!isCollapsed && section.children && section.children.length > 0 && (
        <div className="ml-4 border-l-2 border-gray-100 pl-4">
          {section.children.map((child, index) => (
            <SectionRenderer
              key={child.id}
              section={child}
              isEditable={isEditable}
              isFirst={index === 0}
              selectedBlockId={selectedBlockId}
              onBlockSelect={onBlockSelect}
              onBlockChange={onBlockChange}
              onBlockDuplicate={onBlockDuplicate}
              onBlockDelete={onBlockDelete}
              onAddBlock={onAddBlock}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onDragOver={onDragOver}
            />
          ))}
        </div>
      )}

      {/* Add block button (visible in edit mode) */}
      {isEditable && !isCollapsed && section.blocks.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => onAddBlock?.(section.id)}
            className="group flex items-center gap-1.5 px-4 py-2 text-sm text-primary-500 hover:text-primary-600 border border-dashed border-primary-200 hover:border-primary-400 rounded-lg transition-all hover:bg-primary-50"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
            Ajouter un bloc
          </button>
        </div>
      )}
    </section>
  );
};
