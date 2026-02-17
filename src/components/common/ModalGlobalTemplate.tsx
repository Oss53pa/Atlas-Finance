import React from 'react';

interface ModalGlobalTemplateBtnProps {
  hide: () => void;
  typeBtn: string;
  textCancel: string;
  textSave: string;
  disabled?: boolean;
}

export const ModalGlobalTemplateBtn: React.FC<ModalGlobalTemplateBtnProps> = ({
  hide,
  typeBtn,
  textCancel,
  textSave,
  disabled = false
}) => {
  return (
    <div className="modal-footer d-flex justify-content-between">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={hide}
      >
        {textCancel}
      </button>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disabled} aria-label="Enregistrer">
        {textSave}
      </button>
    </div>
  );
};