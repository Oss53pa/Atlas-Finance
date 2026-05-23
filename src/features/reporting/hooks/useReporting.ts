import { useState, useEffect } from 'react';
import {
  Report,
  ReportStats,
  ReportFilters,
  ReportTemplate,
  Dashboard,
} from '../types/reporting.types';
import { reportingService } from '../services/reportingService';
import { useData } from '../../../contexts/DataContext';

export const useReports = (filters?: ReportFilters) => {
  const { adapter } = useData();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportingService.getReports(adapter, filters);
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement rapports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [adapter, filters]);

  return { reports, loading, error, refetch: fetchReports };
};

export const useReportStats = () => {
  const { adapter } = useData();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportingService.getReportStats(adapter);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [adapter]);

  return { stats, loading, error };
};

export const useTemplates = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportingService.getTemplates();
        setTemplates(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement modèles');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return { templates, loading, error };
};

export const useDashboards = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboards = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportingService.getDashboards();
        setDashboards(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement dashboards');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, []);

  return { dashboards, loading, error };
};