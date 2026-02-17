import { useState } from 'react';

export interface ModalsState {
  showActionModal: boolean;
  showRapportMensuelModal: boolean;
  showAnalyseROIModal: boolean;
  showPerformanceEquipeModal: boolean;
  showPrevisionTresorerieModal: boolean;
  showDossiersRisqueModal: boolean;
  showExportPersonnaliseModal: boolean;
  showPlanDetailModal: boolean;
  showEnregistrerPaiementModal: boolean;
  showRelancePlanModal: boolean;
  showCreateDossierModal: boolean;
  showDossierActionModal: boolean;
  showDossierDetail: boolean;
  showDossierSummary: boolean;
  showEmailPreview: boolean;
  showTransferModal: boolean;
  showTransferContentieuxModal: boolean;
}

export const useModalsState = () => {
  // Modales principales
  const [showActionModal, setShowActionModal] = useState(false);
  const [showRapportMensuelModal, setShowRapportMensuelModal] = useState(false);
  const [showAnalyseROIModal, setShowAnalyseROIModal] = useState(false);
  const [showPerformanceEquipeModal, setShowPerformanceEquipeModal] = useState(false);
  const [showPrevisionTresorerieModal, setShowPrevisionTresorerieModal] = useState(false);
  const [showDossiersRisqueModal, setShowDossiersRisqueModal] = useState(false);
  const [showExportPersonnaliseModal, setShowExportPersonnaliseModal] = useState(false);

  // Modales de plans
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [showEnregistrerPaiementModal, setShowEnregistrerPaiementModal] = useState(false);
  const [showRelancePlanModal, setShowRelancePlanModal] = useState(false);

  // Modales de dossiers
  const [showCreateDossierModal, setShowCreateDossierModal] = useState(false);
  const [showDossierActionModal, setShowDossierActionModal] = useState(false);
  const [showDossierDetail, setShowDossierDetail] = useState(false);
  const [showDossierSummary, setShowDossierSummary] = useState(false);

  // Modales de communication
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferContentieuxModal, setShowTransferContentieuxModal] = useState(false);

  // Fonction pour fermer toutes les modales
  const closeAllModals = () => {
    setShowActionModal(false);
    setShowRapportMensuelModal(false);
    setShowAnalyseROIModal(false);
    setShowPerformanceEquipeModal(false);
    setShowPrevisionTresorerieModal(false);
    setShowDossiersRisqueModal(false);
    setShowExportPersonnaliseModal(false);
    setShowPlanDetailModal(false);
    setShowEnregistrerPaiementModal(false);
    setShowRelancePlanModal(false);
    setShowCreateDossierModal(false);
    setShowDossierActionModal(false);
    setShowDossierDetail(false);
    setShowDossierSummary(false);
    setShowEmailPreview(false);
    setShowTransferModal(false);
    setShowTransferContentieuxModal(false);
  };

  return {
    modals: {
      showActionModal,
      showRapportMensuelModal,
      showAnalyseROIModal,
      showPerformanceEquipeModal,
      showPrevisionTresorerieModal,
      showDossiersRisqueModal,
      showExportPersonnaliseModal,
      showPlanDetailModal,
      showEnregistrerPaiementModal,
      showRelancePlanModal,
      showCreateDossierModal,
      showDossierActionModal,
      showDossierDetail,
      showDossierSummary,
      showEmailPreview,
      showTransferModal,
      showTransferContentieuxModal
    },
    actions: {
      setShowActionModal,
      setShowRapportMensuelModal,
      setShowAnalyseROIModal,
      setShowPerformanceEquipeModal,
      setShowPrevisionTresorerieModal,
      setShowDossiersRisqueModal,
      setShowExportPersonnaliseModal,
      setShowPlanDetailModal,
      setShowEnregistrerPaiementModal,
      setShowRelancePlanModal,
      setShowCreateDossierModal,
      setShowDossierActionModal,
      setShowDossierDetail,
      setShowDossierSummary,
      setShowEmailPreview,
      setShowTransferModal,
      setShowTransferContentieuxModal,
      closeAllModals
    }
  };
};