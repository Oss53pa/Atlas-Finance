import React from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Trash2,
  Eye,
  Edit,
  Copy,
  CheckCircle,
  FileText,
  MoreVertical
} from 'lucide-react';
import { Button } from '../ui';
import { toast } from 'react-hot-toast';

interface ActionButtonsProps {
  actions: ActionButton[];
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export interface ActionButton {
  type:
    | 'download'
    | 'upload'
    | 'refresh'
    | 'play'
    | 'pause'
    | 'settings'
    | 'delete'
    | 'view'
    | 'edit'
    | 'copy'
    | 'validate'
    | 'report'
    | 'more';
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  actions,
  size = 'sm',
  variant = 'ghost',
  className = ''
}) => {
  const getIcon = (type: ActionButton['type']) => {
    const iconClass = 'h-4 w-4';
    switch (type) {
      case 'download':
        return <Download className={iconClass} />;
      case 'upload':
        return <Upload className={iconClass} />;
      case 'refresh':
        return <RefreshCw className={iconClass} />;
      case 'play':
        return <Play className={iconClass} />;
      case 'pause':
        return <Pause className={iconClass} />;
      case 'settings':
        return <Settings className={iconClass} />;
      case 'delete':
        return <Trash2 className={iconClass} />;
      case 'view':
        return <Eye className={iconClass} />;
      case 'edit':
        return <Edit className={iconClass} />;
      case 'copy':
        return <Copy className={iconClass} />;
      case 'validate':
        return <CheckCircle className={iconClass} />;
      case 'report':
        return <FileText className={iconClass} />;
      case 'more':
        return <MoreVertical className={iconClass} />;
      default:
        return null;
    }
  };

  const handleClick = (action: ActionButton) => {
    if (action.onClick) {
      action.onClick();
    } else {
      // Action par défaut
      toast.info(`Action: ${action.label || action.type}`);
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={variant}
          size={size}
          onClick={() => handleClick(action)}
          disabled={action.disabled}
          title={action.tooltip}
          className={action.type === 'delete' ? 'hover:text-red-500' : ''}
        >
          {action.loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            getIcon(action.type)
          )}
          {action.label && <span className="ml-1">{action.label}</span>}
        </Button>
      ))}
    </div>
  );
};

// Composants spécifiques pour des actions courantes
export const DownloadButton: React.FC<{
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
  <ActionButtons
    actions={[{ type: 'download', onClick, label, disabled }]}
  />
);

export const UploadButton: React.FC<{
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
  <ActionButtons
    actions={[{ type: 'upload', onClick, label, disabled }]}
  />
);

export const SettingsButton: React.FC<{
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
  <ActionButtons
    actions={[{ type: 'settings', onClick, label, disabled }]}
  />
);

export const EditButton: React.FC<{
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
  <ActionButtons
    actions={[{ type: 'edit', onClick, label, disabled }]}
  />
);

export const DeleteButton: React.FC<{
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
  <ActionButtons
    actions={[{ type: 'delete', onClick, label, disabled }]}
  />
);

export const ViewButton: React.FC<{
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}> = ({ onClick, label, disabled }) => (
  <ActionButtons
    actions={[{ type: 'view', onClick, label, disabled }]}
  />
);
