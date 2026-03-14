/**
 * Hook pour accéder au type d'activité de l'entreprise et à la configuration
 * du tableau de bord adaptée.
 */

import { useState, useEffect, useCallback } from 'react';
import { companyService, type ActivityType } from '../services/company.service';
import {
  getActivityDashboardConfig,
  type ActivityDashboardConfig,
} from '../config/activityDashboard.config';

interface UseActivityTypeResult {
  activityType: ActivityType;
  setActivityType: (type: ActivityType) => Promise<void>;
  dashboardConfig: ActivityDashboardConfig;
  loading: boolean;
}

export function useActivityType(): UseActivityTypeResult {
  const [activityType, setActivityTypeState] = useState<ActivityType>('negoce');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getCurrentCompany().then((company) => {
      setActivityTypeState(company.activite_type || 'negoce');
      setLoading(false);
    });
  }, []);

  const setActivityType = useCallback(async (type: ActivityType) => {
    await companyService.updateCompany({ activite_type: type });
    setActivityTypeState(type);
  }, []);

  return {
    activityType,
    setActivityType,
    dashboardConfig: getActivityDashboardConfig(activityType),
    loading,
  };
}
