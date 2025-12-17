/**
 * Hook personnalisé pour gérer les exports du dashboard
 * Gère la création, le téléchargement et la liste des exports
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ExportService,
  DashboardExport,
  ExportCreateData,
  ExportFilters,
  ExportType,
} from '../services/dashboardApi';

interface UseExportsReturn {
  exports: DashboardExport[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  refresh: () => Promise<void>;
  createExport: (type: ExportType, fileName?: string, filters?: Record<string, any>) => Promise<DashboardExport | null>;
  deleteExport: (id: string) => Promise<void>;
  downloadExport: (id: string) => Promise<void>;
}

interface UseExportsOptions {
  filters?: ExportFilters;
  autoRefresh?: boolean;
  refreshInterval?: number; // en millisecondes
  autoLoad?: boolean; // Charger automatiquement les exports au montage
}

/**
 * Hook pour gérer les exports
 *
 * @param options - Options de configuration
 * @returns Objet contenant les exports et les méthodes d'action
 *
 * @example
 * ```tsx
 * const { exports, createExport, downloadExport, loading } = useExports({
 *   filters: { export_type: 'pdf' },
 *   autoRefresh: true,
 *   refreshInterval: 60000 // 1 minute
 * });
 *
 * // Créer un export
 * const newExport = await createExport('pdf', 'dashboard_kpis.pdf');
 *
 * // Télécharger un export
 * await downloadExport(exportId);
 * ```
 */
export const useExports = (
  options: UseExportsOptions = {}
): UseExportsReturn => {
  const {
    filters,
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute par défaut
    autoLoad = true,
  } = options;

  const [exports, setExports] = useState<DashboardExport[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge la liste des exports
   */
  const fetchExports = useCallback(async () => {
    try {
      setError(null);
      const data = await ExportService.getExports(filters);
      setExports(data);
    } catch (err) {
      console.error('Erreur lors du chargement des exports:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Crée un nouvel export
   */
  const createExport = useCallback(
    async (
      type: ExportType,
      fileName?: string,
      customFilters?: Record<string, any>
    ): Promise<DashboardExport | null> => {
      setCreating(true);
      setError(null);

      try {
        // Récupérer l'ID de la société active
        const companyId = parseInt(
          localStorage.getItem('active_center_id') || '1'
        );

        // Générer nom de fichier si non fourni
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const defaultFileName = fileName || `dashboard_${type}_${timestamp}.${type}`;

        // Préparer les données d'export
        const exportData: ExportCreateData = {
          company: companyId,
          export_type: type,
          file_name: defaultFileName,
          filters: customFilters || {},
        };

        // Créer l'export
        const newExport = await ExportService.createExport(exportData);

        // Rafraîchir la liste des exports
        await fetchExports();

        // Si l'export est immédiatement complété, proposer le téléchargement
        if (newExport.status === 'completed' && newExport.file_url) {
          // Notification de succès
          console.log('Export créé avec succès:', newExport.file_name);
        } else if (newExport.status === 'failed') {
          setError(newExport.error_message || 'Erreur lors de la génération');
        }

        return newExport;
      } catch (err) {
        console.error('Erreur lors de la création de l\'export:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la création');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [fetchExports]
  );

  /**
   * Supprime un export
   */
  const deleteExport = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await ExportService.deleteExport(id);
        // Rafraîchir après suppression
        await fetchExports();
      } catch (err) {
        console.error('Erreur lors de la suppression de l\'export:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
        throw err;
      }
    },
    [fetchExports]
  );

  /**
   * Télécharge un export
   */
  const downloadExport = useCallback(async (id: string) => {
    try {
      setError(null);
      await ExportService.downloadFile(id);
    } catch (err) {
      console.error('Erreur lors du téléchargement de l\'export:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
      throw err;
    }
  }, []);

  /**
   * Rafraîchir manuellement
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchExports();
  }, [fetchExports]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      fetchExports();
    }
  }, [fetchExports, autoLoad]);

  // Auto-refresh si activé
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchExports();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchExports]);

  return {
    exports,
    loading,
    error,
    creating,
    refresh,
    createExport,
    deleteExport,
    downloadExport,
  };
};
