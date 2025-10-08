import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'warning',
  confirmLoading = false
}) => {
  const { t } = useLanguage();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap - focus on confirm button when modal opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  }[variant];

  const Icon = variantConfig.icon;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !confirmLoading) {
      onClose();
    } else if (e.key === 'Enter' && !confirmLoading) {
      e.preventDefault();
      onConfirm();
    }
  };

  const handleConfirm = async () => {
    if (confirmLoading) return;
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="bg-white rounded-lg max-w-md w-full shadow-xl transform transition-all animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className={`flex items-start p-6 border-b ${variantConfig.borderColor}`}>
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${variantConfig.bgColor} flex items-center justify-center mr-4`}>
            <Icon className={`w-6 h-6 ${variantConfig.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-[#191919]">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
            aria-label="Fermer"
            disabled={confirmLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p id="confirm-dialog-description" className="text-[#444444] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#D9D9D9] rounded-lg text-[#444444] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            disabled={confirmLoading}
            tabIndex={0}
          >
            {cancelText || 'Annuler'}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 ${variantConfig.buttonBg} ${confirmLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={confirmLoading}
            tabIndex={0}
          >
            {confirmLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Chargement...</span>
              </span>
            ) : (
              confirmText || 'Confirmer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
