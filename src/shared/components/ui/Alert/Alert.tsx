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
    bg: 'bg-[#6A8A82]/10',
    border: 'border-[#6A8A82]',
    text: 'text-[#6A8A82]',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-[#B85450]/10',
    border: 'border-[#B85450]',
    text: 'text-[#B85450]',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-[#B87333]/10',
    border: 'border-[#B87333]',
    text: 'text-[#B87333]',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-[#7A99AC]/10',
    border: 'border-[#7A99AC]',
    text: 'text-[#7A99AC]',
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
          <div className="text-sm text-[#444444]">{children}</div>
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