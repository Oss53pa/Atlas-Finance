import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: boolean;
}

export const Alert: React.FC<AlertProps> = ({ 
  children, 
  variant = 'info', 
  title,
  dismissible = false,
  onDismiss,
  className = '',
  icon = true
}) => {
  const variants = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-500'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: XCircle,
      iconColor: 'text-red-500'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-500'
    }
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-lg border ${config.bg} ${className}`}
    >
      <div className="flex items-start space-x-3">
        {icon && (
          <div className="flex-shrink-0">
            <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-medium ${config.text} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.text}`}>
            {children}
          </div>
        </div>

        {dismissible && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ml-2 p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 ${config.text} transition-colors`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const AlertDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`text-sm ${className}`}>
    {children}
  </div>
);

// Composants d'alerte prédéfinis pour une utilisation rapide
export const SuccessAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="success" />
);

export const WarningAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="warning" />
);

export const ErrorAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="error" />
);

export const InfoAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="info" />
);

// Wrapper avec AnimatePresence pour les alerts dismissibles
export const AlertContainer: React.FC<{
  children: React.ReactNode;
  show: boolean;
}> = ({ children, show }) => (
  <AnimatePresence>
    {show && children}
  </AnimatePresence>
);