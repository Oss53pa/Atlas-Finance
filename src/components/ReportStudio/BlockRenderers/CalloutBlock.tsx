import React from 'react';
import { cn } from '@/utils/cn';
import { CalloutBlock as CalloutBlockType } from '@/types/reportStudio';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Rocket,
  MapPin,
  AlertCircle,
  ClipboardList,
  FileText,
  Quote,
} from 'lucide-react';

// Map icon names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  'info': Info,
  'lightbulb': Lightbulb,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'rocket': Rocket,
  'map-pin': MapPin,
  'clipboard-list': ClipboardList,
  'file-text': FileText,
  'quote': Quote,
};

// Get icon component from name
const getIcon = (iconName?: string, defaultIcon?: React.ElementType) => {
  if (!iconName) return defaultIcon || Info;
  return iconMap[iconName] || defaultIcon || Info;
};

interface CalloutBlockProps {
  block: CalloutBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<CalloutBlockType>) => void;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  // Monochrome variant config
  const variantConfig = {
    info: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      iconColor: 'text-gray-500',
      title: 'text-gray-800',
      text: 'text-gray-600',
      defaultIcon: Info,
    },
    warning: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      iconColor: 'text-gray-500',
      title: 'text-gray-800',
      text: 'text-gray-600',
      defaultIcon: AlertTriangle,
    },
    success: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      iconColor: 'text-gray-500',
      title: 'text-gray-800',
      text: 'text-gray-600',
      defaultIcon: CheckCircle,
    },
    error: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      iconColor: 'text-gray-500',
      title: 'text-gray-800',
      text: 'text-gray-600',
      defaultIcon: AlertCircle,
    },
    tip: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      iconColor: 'text-gray-500',
      title: 'text-gray-800',
      text: 'text-gray-600',
      defaultIcon: Lightbulb,
    },
  };

  const config = variantConfig[block.variant];
  const IconComponent = getIcon(block.icon, config.defaultIcon);

  return (
    <div
      className={cn(
        'my-4 p-4 rounded-lg border-l-4',
        config.bg,
        config.border,
        isEditable && 'cursor-text'
      )}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1">
          {block.title && (
            <h4 className={cn('font-semibold mb-1', config.title)}>
              {block.title}
            </h4>
          )}
          <p
            className={cn('text-sm whitespace-pre-line', config.text)}
            contentEditable={isEditable}
            suppressContentEditableWarning
          >
            {block.content}
          </p>
        </div>
      </div>
    </div>
  );
};
