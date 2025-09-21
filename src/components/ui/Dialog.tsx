import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onOpenChange) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={handleBackdropClick}
      />
      
      {/* Dialog container */}
      <div className="relative z-50 w-full max-w-lg mx-4">
        {children}
      </div>
    </div>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "relative bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

const DialogHeader: React.FC<DialogHeaderProps> = ({ className, children }) => {
  return (
    <div className={cn("flex flex-col space-y-2 mb-4", className)}>
      {children}
    </div>
  );
};

const DialogTitle: React.FC<DialogTitleProps> = ({ className, children }) => {
  return (
    <h2 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h2>
  );
};

const DialogDescription: React.FC<DialogDescriptionProps> = ({ className, children }) => {
  return (
    <p className={cn("text-sm text-gray-600", className)}>
      {children}
    </p>
  );
};

const DialogFooter: React.FC<DialogFooterProps> = ({ className, children }) => {
  return (
    <div className={cn("flex justify-end space-x-3 mt-6", className)}>
      {children}
    </div>
  );
};

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };