/**
 * WiseBook Design System - Modal Component
 * Fully accessible modal with focus management and ARIA attributes
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';
import { Button } from './Button';

// Modal variants
const modalVariants = cva(
  [
    'relative bg-white rounded-lg shadow-xl',
    'w-full max-h-[90vh] overflow-hidden',
    'flex flex-col',
  ],
  {
    variants: {
      size: {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        full: 'max-w-none mx-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Overlay variants
const overlayVariants = cva([
  'fixed inset-0 z-50',
  'bg-black bg-opacity-50',
  'flex items-center justify-center p-4',
  'animate-in fade-in-0 duration-300',
]);

// Content area variants
const contentVariants = cva([
  'animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-2 duration-300',
]);

// Hook for managing focus trap
const useFocusTrap = (isOpen: boolean, modalRef: React.RefObject<HTMLElement>) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the modal
    const getFocusableElements = () => {
      if (!modalRef.current) return [];

      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(', ');

      return Array.from(modalRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus the first focusable element or the modal itself
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modalRef.current.focus();
    }

    // Add event listener for tab trapping
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, modalRef]);
};

// Hook for preventing body scroll
const usePreventBodyScroll = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);
};

// Close icon component
const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Modal header component
export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  className,
  onClose,
  showCloseButton = true,
}) => (
  <div className={clsx(
    'flex items-center justify-between p-6 border-b border-neutral-200',
    className
  )}>
    <h2 className="text-lg font-semibold text-neutral-800 flex-grow">
      {children}
    </h2>
    {showCloseButton && onClose && (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label="Close modal"
        className="ml-4 p-1 h-8 w-8 rounded-md hover:bg-neutral-100"
      >
        <CloseIcon className="w-4 h-4" />
      </Button>
    )}
  </div>
);

// Modal body component
export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => (
  <div className={clsx('flex-1 p-6 overflow-y-auto', className)}>
    {children}
  </div>
);

// Modal footer component
export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => (
  <div className={clsx(
    'flex items-center justify-end gap-3 p-6 border-t border-neutral-200',
    className
  )}>
    {children}
  </div>
);

// Main Modal component props
export interface ModalProps extends VariantProps<typeof modalVariants> {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to call when the modal should be closed */
  onClose?: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether clicking the overlay should close the modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape should close the modal */
  closeOnEscape?: boolean;
  /** Accessible title for screen readers */
  'aria-label'?: string;
  /** ID of element that labels the modal */
  'aria-labelledby'?: string;
  /** ID of element that describes the modal */
  'aria-describedby'?: string;
  /** Role of the modal */
  role?: 'dialog' | 'alertdialog';
  /** Custom portal container */
  container?: HTMLElement;
}

/**
 * Modal component with comprehensive accessibility and focus management
 *
 * Features:
 * - Focus trapping within modal
 * - Restore focus when closed
 * - Prevent body scroll when open
 * - Keyboard navigation (Tab, Shift+Tab, Escape)
 * - Click outside to close
 * - ARIA attributes for screen readers
 * - Multiple sizes
 * - Smooth animations
 * - Portal rendering
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   size="lg"
 *   aria-labelledby="modal-title"
 * >
 *   <ModalHeader onClose={handleClose}>
 *     <span id="modal-title">Confirm Action</span>
 *   </ModalHeader>
 *   <ModalBody>
 *     Are you sure you want to continue?
 *   </ModalBody>
 *   <ModalFooter>
 *     <Button variant="outline" onClick={handleClose}>Cancel</Button>
 *     <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  size,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  role = 'dialog',
  container,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus management
  useFocusTrap(isOpen, modalRef);

  // Prevent body scroll
  usePreventBodyScroll(isOpen);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (!closeOnOverlayClick || !onClose) return;

    // Only close if clicking the overlay itself, not the modal content
    if (event.target === overlayRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className={overlayVariants()}
      onClick={handleOverlayClick}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        className={clsx(
          modalVariants({ size }),
          contentVariants(),
          className
        )}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // Render in portal
  const portalContainer = container || document.body;
  return createPortal(modalContent, portalContainer);
};

Modal.displayName = 'Modal';

// Export modal variants for external use
export { modalVariants };

// Compound exports
export const ModalComponent = Object.assign(Modal, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});

// Default export as compound component
export default ModalComponent;