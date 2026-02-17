import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastProps, ToastContainer } from '../components/ui/Toast';

interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => void;
  removeToast: (id: string) => void;
  toasts: ToastProps[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ 
  children: React.ReactNode; 
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}> = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastProps = {
      ...toast,
      id,
      onDismiss: (toastId) => removeToast(toastId)
    };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} position={position} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return {
    toast: {
      success: (message: string, title?: string) => context.addToast({ message, title, variant: 'success' }),
      error: (message: string, title?: string) => context.addToast({ message, title, variant: 'error' }),
      warning: (message: string, title?: string) => context.addToast({ message, title, variant: 'warning' }),
      info: (message: string, title?: string) => context.addToast({ message, title, variant: 'info' }),
      custom: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => context.addToast(toast)
    },
    dismiss: context.removeToast,
    toasts: context.toasts
  };
};