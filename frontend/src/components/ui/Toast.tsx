import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  dismissible?: boolean;
  onDismiss?: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  variant = 'info',
  duration = 5000,
  dismissible = true,
  onDismiss,
}) => {
  const variants = {
    success: {
      bg: 'bg-white border-l-4 border-green-500 shadow-lg',
      iconBg: 'bg-green-100',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    warning: {
      bg: 'bg-white border-l-4 border-yellow-500 shadow-lg',
      iconBg: 'bg-yellow-100',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600'
    },
    error: {
      bg: 'bg-white border-l-4 border-red-500 shadow-lg',
      iconBg: 'bg-red-100',
      icon: XCircle,
      iconColor: 'text-red-600'
    },
    info: {
      bg: 'bg-white border-l-4 border-blue-500 shadow-lg',
      iconBg: 'bg-blue-100',
      icon: Info,
      iconColor: 'text-blue-600'
    }
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`${config.bg} rounded-lg p-4 max-w-sm w-full pointer-events-auto`}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${config.iconBg} rounded-full p-1`}>
          <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {title}
            </p>
          )}
          <p className="text-sm text-gray-700">
            {message}
          </p>
        </div>

        {dismissible && (
          <button
            onClick={() => onDismiss?.(id)}
            className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-700 hover:text-gray-600" />
          </button>
        )}
      </div>
      
      {duration > 0 && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className={`h-1 ${config.iconColor.replace('text-', 'bg-').replace('-600', '-200')} mt-3 rounded-full`}
        />
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}> = ({ toasts, position = 'top-right' }) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-2 pointer-events-none`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};