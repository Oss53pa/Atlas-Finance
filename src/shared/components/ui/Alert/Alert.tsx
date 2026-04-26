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
    bg: 'bg-[var(--color-primary)]/10',
    border: 'border-[var(--color-primary)]',
    text: 'text-[var(--color-primary)]',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-[#ef4444]/10',
    border: 'border-[#ef4444]',
    text: 'text-[#ef4444]',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-[var(--color-text-secondary)]/10',
    border: 'border-[var(--color-text-secondary)]',
    text: 'text-[var(--color-text-secondary)]',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-[var(--color-text-tertiary)]/10',
    border: 'border-[var(--color-text-tertiary)]',
    text: 'text-[var(--color-text-tertiary)]',
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