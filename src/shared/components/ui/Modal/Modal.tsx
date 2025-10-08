import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps } from './Modal.types';

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose, showCloseButton = true }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
    {title && <h2 className="text-xl font-semibold text-[#191919]">{title}</h2>}
    {showCloseButton && onClose && (
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-[#ECECEC] transition-colors"
        aria-label="Fermer"
      >
        <X className="h-5 w-5 text-[#767676]" />
      </button>
    )}
  </div>
);

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-[#E8E8E8] bg-[#FAFAFA] ${className}`}>
    {children}
  </div>
);

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div
        className={`
          w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl
          animate-slideInUp
          ${className}
        `}
      >
        {(title || showCloseButton) && (
          <ModalHeader title={title} onClose={onClose} showCloseButton={showCloseButton} />
        )}

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>

        {footer && <ModalFooter>{footer}</ModalFooter>}
      </div>
    </div>,
    document.body
  );
};

Modal.displayName = 'Modal';