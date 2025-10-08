import { useState } from 'react';
import type { DossierRecouvrement } from '../types';

export const useSelectionsState = () => {
  // Sélections principales
  const [selectedCreance, setSelectedCreance] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDossierAction, setSelectedDossierAction] = useState<DossierRecouvrement | null>(null);
  const [selectedDossierDetail, setSelectedDossierDetail] = useState<DossierRecouvrement | null>(null);
  const [selectedDossierSummary, setSelectedDossierSummary] = useState<DossierRecouvrement | null>(null);
  const [selectedTransferDossier, setSelectedTransferDossier] = useState<DossierRecouvrement | null>(null);

  // Sélections multiples
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());

  // États de dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState('rappel_amical');

  // Fonctions de gestion
  const toggleClientExpanded = (clientId: string) => {
    const newSet = new Set(expandedClients);
    if (newSet.has(clientId)) {
      newSet.delete(clientId);
    } else {
      newSet.add(clientId);
    }
    setExpandedClients(newSet);
  };

  const toggleFactureSelection = (factureId: string) => {
    const newSet = new Set(selectedFactures);
    if (newSet.has(factureId)) {
      newSet.delete(factureId);
    } else {
      newSet.add(factureId);
    }
    setSelectedFactures(newSet);
  };

  const clearAllSelections = () => {
    setSelectedCreance(null);
    setSelectedPlan(null);
    setSelectedDossierAction(null);
    setSelectedDossierDetail(null);
    setSelectedDossierSummary(null);
    setSelectedTransferDossier(null);
    setExpandedClients(new Set());
    setSelectedFactures(new Set());
    setOpenDropdownId(null);
  };

  return {
    selections: {
      selectedCreance,
      selectedPlan,
      selectedDossierAction,
      selectedDossierDetail,
      selectedDossierSummary,
      selectedTransferDossier,
      expandedClients,
      selectedFactures,
      openDropdownId,
      selectedTemplateType
    },
    actions: {
      setSelectedCreance,
      setSelectedPlan,
      setSelectedDossierAction,
      setSelectedDossierDetail,
      setSelectedDossierSummary,
      setSelectedTransferDossier,
      setExpandedClients,
      setSelectedFactures,
      setOpenDropdownId,
      setSelectedTemplateType,
      toggleClientExpanded,
      toggleFactureSelection,
      clearAllSelections
    }
  };
};