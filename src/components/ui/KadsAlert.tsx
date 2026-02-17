import React, { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Clock } from 'lucide-react';

interface KadsAlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action?: string;
  time?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const KadsAlert: React.FC<KadsAlertProps> = ({
  type,
  title,
  message,
  action,
  time,
  onAction,
  onDismiss,
  className = ''
}) => {
  const typeConfig = {
    success: {
      bgClass: 'bg-green-50 border-green-400',
      iconClass: 'text-green-600',
      textClass: 'text-green-700',
      actionClass: 'text-green-700 hover:text-green-800',
      icon: CheckCircle
    },
    warning: {
      bgClass: 'bg-yellow-50 border-yellow-400',
      iconClass: 'text-yellow-600',
      textClass: 'text-yellow-700',
      actionClass: 'text-yellow-700 hover:text-yellow-800',
      icon: AlertTriangle
    },
    error: {
      bgClass: 'bg-red-50 border-red-400',
      iconClass: 'text-red-600',
      textClass: 'text-red-700',
      actionClass: 'text-red-700 hover:text-red-800',
      icon: AlertTriangle
    },
    info: {
      bgClass: 'bg-[#6A8A82]/10 border-[#6A8A82]/40',
      iconClass: 'text-[#6A8A82]',
      textClass: 'text-[#6A8A82]',
      actionClass: 'text-[#6A8A82] hover:text-[#5A7A72]',
      icon: Info
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <div className={`
      p-4 rounded-lg border-l-4 relative ${config.bgClass} ${className}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <IconComponent className={`w-5 h-5 ${config.iconClass} flex-shrink-0 mt-0.5`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className={`text-sm font-medium ${config.textClass}`}>
                {title}
              </h3>
              {time && (
                <span className="text-xs text-gray-700 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Il y a {time}</span>
                </span>
              )}
            </div>
            
            <p className={`text-sm ${config.textClass} mb-2`}>
              {message}
            </p>
            
            {action && onAction && (
              <button
                onClick={onAction}
                className={`text-xs font-medium ${config.actionClass} transition-colors`}
              >
                {action} →
              </button>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${config.iconClass} hover:opacity-75 transition-opacity ml-3`} aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default KadsAlert;