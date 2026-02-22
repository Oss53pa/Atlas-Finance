import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  onClose?: () => void;
  className?: string;
}

const variantConfig = {
  success: {
    bg: 'bg-[#171717]/10',
    border: 'border-[#171717]',
    text: 'text-[#171717]',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-[#ef4444]/10',
    border: 'border-[#ef4444]',
    text: 'text-[#ef4444]',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-[#525252]/10',
    border: 'border-[#525252]',
    text: 'text-[#525252]',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-[#737373]/10',
    border: 'border-[#737373]',
    text: 'text-[#737373]',
    icon: Info,
  },
};

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  onClose,
  className = '',
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={`
        rounded-lg border-l-4 p-4
        ${config.bg} ${config.border}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${config.text}`} />

        <div className="flex-1">
          {title && (
            <h3 className={`font-semibold ${config.text} mb-1`}>{title}</h3>
          )}
          <div className="text-sm text-[#404040]">{children}</div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 p-1 rounded hover:bg-black/5 ${config.text}`} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

Alert.displayName = 'Alert';