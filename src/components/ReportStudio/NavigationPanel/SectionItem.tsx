import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/utils/cn';
import { Section } from '@/types/reportStudio';
import {
  FileText,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Bot,
  Pencil,
  FileEdit,
  GripVertical,
  ChevronRight,
  Lock,
  MessageCircle,
  Plus,
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
const getIcon = (iconName?: string) => {
  if (!iconName) return FileText;
  return iconMap[iconName] || FileText;
};

interface SectionItemProps {
  section: Section;
  isSelected: boolean;
  isExpanded: boolean;
  depth: number;
  onClick: () => void;
  onToggleExpand: () => void;
  onAddChild: () => void;
}

export const SectionItem: React.FC<SectionItemProps> = ({
  section,
  isSelected,
  isExpanded,
  depth,
  onClick,
  onToggleExpand,
  onAddChild,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = section.children && section.children.length > 0;

  const statusIcons: Record<string, React.ElementType> = {
    generated: Bot,
    edited: Pencil,
    manual: FileEdit,
  };

  const completionColors = {
    complete: 'bg-success',
    draft: 'bg-warning',
    needs_review: 'bg-warning',
  };

  const IconComponent = getIcon(section.icon);
  const StatusIcon = statusIcons[section.status] || FileText;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-primary-100',
          isDragging && 'opacity-50',
          section.isLocked && 'opacity-60'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onClick}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 -ml-1"
        >
          <GripVertical className="w-4 h-4 text-primary-400" />
        </button>

        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-0.5 hover:bg-primary-200 rounded"
          >
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Section icon */}
        <IconComponent className="w-4 h-4 text-gray-500" />

        {/* Section title */}
        <span className="flex-1 text-sm truncate">{section.title}</span>

        {/* Status indicators */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Completion status */}
          {section.metadata?.completionStatus && (
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                completionColors[section.metadata.completionStatus]
              )}
              title={section.metadata.completionStatus}
            />
          )}

          {/* Comments indicator */}
          {section.metadata?.hasComments && (
            <MessageCircle className="w-4 h-4 text-info" />
          )}

          {/* AI confidence score */}
          {section.metadata?.aiConfidence !== undefined && (
            <span
              className="text-xs text-primary-400"
              title={`Confiance IA: ${Math.round(section.metadata.aiConfidence * 100)}%`}
            >
              {Math.round(section.metadata.aiConfidence * 100)}%
            </span>
          )}

          {/* Status icon */}
          <StatusIcon className="w-3 h-3 text-gray-400" title={section.status} />

          {/* Lock indicator */}
          {section.isLocked && (
            <Lock className="w-4 h-4 text-primary-400" />
          )}

          {/* Add child button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            className="p-1 hover:bg-primary-200 rounded opacity-0 group-hover:opacity-100"
            title="Ajouter une sous-section"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Page number */}
        {section.pageStart !== undefined && (
          <span className="text-xs text-primary-400 ml-2">
            p.{section.pageStart}
          </span>
        )}
      </div>

      {/* Children sections */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {section.children.map((child) => (
            <SectionItem
              key={child.id}
              section={child}
              isSelected={false}
              isExpanded={true}
              depth={depth + 1}
              onClick={() => {}}
              onToggleExpand={() => {}}
              onAddChild={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};
