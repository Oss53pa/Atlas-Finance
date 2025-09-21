import React from 'react';
import { Toast } from 'react-hot-toast';

export interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  position = 'top-right' 
}) => {
  return null; // React-hot-toast est géré dans main.tsx
};

export default NotificationSystem;