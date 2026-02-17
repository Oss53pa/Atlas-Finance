import React, { forwardRef, useImperativeHandle, useState } from 'react';

interface SweetAlertRef {
  afficherConfirmation: (message: string, confirmText: string, cancelText: string) => Promise<boolean>;
  afficherAlerte: (type: 'success' | 'error', message: string) => void;
}

interface SweetAlertState {
  show: boolean;
  type: 'confirmation' | 'success' | 'error';
  message: string;
  confirmText?: string;
  cancelText?: string;
  resolve?: (value: boolean) => void;
}

const SweetAlertComponent = forwardRef<SweetAlertRef>((_, ref) => {
  const [alert, setAlert] = useState<SweetAlertState>({
    show: false,
    type: 'success',
    message: ''
  });

  useImperativeHandle(ref, () => ({
    afficherConfirmation: (message: string, confirmText: string, cancelText: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setAlert({
          show: true,
          type: 'confirmation',
          message,
          confirmText,
          cancelText,
          resolve
        });
      });
    },
    afficherAlerte: (type: 'success' | 'error', message: string) => {
      setAlert({
        show: true,
        type,
        message
      });

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  }));

  const handleConfirm = () => {
    if (alert.resolve) {
      alert.resolve(true);
    }
    setAlert(prev => ({ ...prev, show: false }));
  };

  const handleCancel = () => {
    if (alert.resolve) {
      alert.resolve(false);
    }
    setAlert(prev => ({ ...prev, show: false }));
  };

  const handleClose = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  if (!alert.show) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {alert.type === 'confirmation' && 'Confirmation'}
              {alert.type === 'success' && 'Succès'}
              {alert.type === 'error' && 'Erreur'}
            </h5>
          </div>
          <div className="modal-body">
            <div className={`alert alert-${alert.type === 'error' ? 'danger' : alert.type === 'success' ? 'success' : 'warning'} mb-0`}>
              {alert.message}
            </div>
          </div>
          <div className="modal-footer">
            {alert.type === 'confirmation' ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  {alert.cancelText}
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirm}>
                  {alert.confirmText}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleClose}>
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

SweetAlertComponent.displayName = 'SweetAlertComponent';

export default SweetAlertComponent;