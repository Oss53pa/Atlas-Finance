import React from 'react';

interface BootstrapModalProps {
  show: boolean;
  onHide: () => void;
  size?: 'sm' | 'lg' | 'xl';
  centered?: boolean;
  className?: string;
  backdrop?: 'static' | true | false;
  children: React.ReactNode;
}

const BootstrapModal: React.FC<BootstrapModalProps> = ({
  show,
  onHide,
  size = 'lg',
  centered = false,
  className = '',
  backdrop = true,
  children
}) => {
  if (!show) return null;

  const sizeClass = {
    sm: 'modal-sm',
    lg: 'modal-lg',
    xl: 'modal-xl'
  }[size];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && backdrop !== 'static') {
      onHide();
    }
  };

  return (
    <div
      className={`modal fade show d-block ${className}`}
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
    >
      <div className={`modal-dialog ${sizeClass} ${centered ? 'modal-dialog-centered' : ''}`}>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BootstrapModal;