/**
 * SERVICE API - DASHBOARD EXPORTS
 *
 * Service pour gérer les exports du dashboard
 */

import apiService from './api.service';

// ========================================
// TYPES
// ========================================

export type ExportType = 'pdf' | 'excel' | 'csv' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DashboardExport {
  id: string;
  company: number;
  export_type: ExportType;
  file_name: string;
  file_url?: string;
  file_size?: number;
  status: ExportStatus;
  error_message?: string;
  filters?: Record<string, any>;
  created_at: string;
  completed_at?: string;
  created_by: string;
}

export interface ExportCreateData {
  company: number;
  export_type: ExportType;
  file_name: string;
  filters?: Record<string, any>;
}

export interface ExportFilters {
  export_type?: ExportType;
  status?: ExportStatus;
  date_from?: string;
  date_to?: string;
}

// ========================================
// SERVICE
// ========================================

export const ExportService = {
  /**
   * Récupère la liste des exports
   */
  async getExports(filters?: ExportFilters): Promise<DashboardExport[]> {
    try {
      const response = await apiService.get<DashboardExport[]>('/api/dashboard/exports/', filters);
      return response || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des exports:', error);
      return [];
    }
  },

  /**
   * Récupère un export par son ID
   */
  async getExport(id: string): Promise<DashboardExport | null> {
    try {
      const response = await apiService.get<DashboardExport>(`/api/dashboard/exports/${id}/`);
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'export:', error);
      return null;
    }
  },

  /**
   * Crée un nouvel export
   */
  async createExport(data: ExportCreateData): Promise<DashboardExport> {
    const response = await apiService.post<DashboardExport>('/api/dashboard/exports/', data);
    return response;
  },

  /**
   * Supprime un export
   */
  async deleteExport(id: string): Promise<void> {
    await apiService.delete(`/api/dashboard/exports/${id}/`);
  },

  /**
   * Télécharge le fichier d'un export
   */
  async downloadFile(id: string): Promise<void> {
    try {
      // Récupérer l'export pour obtenir l'URL du fichier
      const exportData = await this.getExport(id);

      if (!exportData?.file_url) {
        throw new Error('URL du fichier non disponible');
      }

      // Créer un lien de téléchargement et cliquer dessus
      const link = document.createElement('a');
      link.href = exportData.file_url;
      link.download = exportData.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      throw error;
    }
  },

  /**
   * Vérifie le statut d'un export
   */
  async checkStatus(id: string): Promise<ExportStatus> {
    const exportData = await this.getExport(id);
    return exportData?.status || 'failed';
  },
};

export default ExportService;
