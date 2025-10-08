import { useState } from 'react';
import type { TabType, DossierTabType, ParametresTabType, RelanceSubTabType } from '../types';

export const useNavigationState = () => {
  const [activeTab, setActiveTab] = useState<TabType>('creances');
  const [activeDossierTab, setActiveDossierTab] = useState<DossierTabType>('dashboard');
  const [activeRelanceSubTab, setActiveRelanceSubTab] = useState<RelanceSubTabType>('historique');
  const [activeParametresTab, setActiveParametresTab] = useState<ParametresTabType>('configuration');
  const [analyticsView, setAnalyticsView] = useState<'dashboard' | 'details'>('dashboard');

  const resetNavigation = () => {
    setActiveTab('creances');
    setActiveDossierTab('dashboard');
    setActiveRelanceSubTab('historique');
    setActiveParametresTab('configuration');
    setAnalyticsView('dashboard');
  };

  return {
    tabs: {
      activeTab,
      activeDossierTab,
      activeRelanceSubTab,
      activeParametresTab,
      analyticsView
    },
    actions: {
      setActiveTab,
      setActiveDossierTab,
      setActiveRelanceSubTab,
      setActiveParametresTab,
      setAnalyticsView,
      resetNavigation
    }
  };
};