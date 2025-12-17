/**
 * WiseBook ERP - SYSCOHADA Import Service
 * Service complet pour l'import du plan comptable SYSCOHADA
 *
 * Fonctionnalités:
 * - Import plan standard (MINIMAL/NORMAL/COMPLET)
 * - Import depuis fichier CSV/Excel
 * - Prévisualisation avant import
 * - Validation de fichiers
 * - Gestion des erreurs détaillée
 *
 * @version 1.0.0 - Phase 1.3 Complete
 * @date 2025-10-19
 */

import { apiClient } from '@/lib/api';
import API_ENDPOINTS from '@/config/apiEndpoints';

// ===========================
// TYPES & INTERFACES
// ===========================

export interface SYSCOHADAImportOptions {
  company_id: string;
  regime: 'NORMAL' | 'MINIMAL' | 'COMPLET';
  overwrite_existing?: boolean;
  activate_accounts?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: Array<{
    account_code: string;
    error: string;
  }>;
  summary: {
    classes: number;
    accounts: number;
    sub_accounts: number;
  };
  message?: string;
}

export interface AccountPreview {
  code: string;
  label: string;
  type: string;
  class: string;
  account_type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  is_reconcilable?: boolean;
}

export interface ImportPreviewResponse {
  accounts: AccountPreview[];
  total: number;
  by_class: Record<string, number>;
  estimated_duration_seconds: number;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  row_count: number;
  preview_rows?: Array<{
    row_number: number;
    code: string;
    label: string;
    type: string;
  }>;
}

export interface ImportHistoryEntry {
  id: string;
  import_date: string;
  regime: string;
  imported_count: number;
  success: boolean;
  user: string;
  duration_seconds: number;
}

// ===========================
// SERVICE CLASS
// ===========================

class SYSCOHADAImportService {
  /**
   * Importer le plan comptable SYSCOHADA standard
   * Supports 3 régimes: MINIMAL (comptes principaux), NORMAL (standard), COMPLET (tous comptes)
   */
  async importStandardChart(options: SYSCOHADAImportOptions): Promise<ImportResult> {
    try {
      const response = await apiClient.post<ImportResult>(
        API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA,
        {
          company_id: options.company_id,
          regime: options.regime,
          overwrite_existing: options.overwrite_existing || false,
          activate_accounts: options.activate_accounts !== false, // true par défaut
        }
      );

      return response;
    } catch (error) {
      console.error('Error importing SYSCOHADA chart:', error);
      throw new Error(
        `Impossible d'importer le plan SYSCOHADA ${options.regime}. Vérifiez votre connexion.`
      );
    }
  }

  /**
   * Importer le plan comptable depuis un fichier CSV ou Excel
   * Format attendu: Code, Libellé, Type, Classe
   */
  async importFromFile(
    company_id: string,
    file: File,
    options?: {
      overwrite_existing?: boolean;
      validate_only?: boolean;
    }
  ): Promise<ImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', company_id);

      if (options?.overwrite_existing) {
        formData.append('overwrite_existing', 'true');
      }
      if (options?.validate_only) {
        formData.append('validate_only', 'true');
      }

      // Utiliser fetch pour FormData car apiClient peut ne pas le gérer correctement
      const response = await fetch(API_ENDPOINTS.ACCOUNTING.IMPORT_CHART_FILE, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error importing from file:', error);
      throw new Error(
        error instanceof Error ? error.message : "Erreur lors de l'import du fichier."
      );
    }
  }

  /**
   * Prévisualiser les comptes avant import
   * Permet de vérifier le nombre et la structure des comptes
   */
  async previewImport(options: SYSCOHADAImportOptions): Promise<ImportPreviewResponse> {
    try {
      const response = await apiClient.post<ImportPreviewResponse>(
        `${API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA}/preview/`,
        {
          company_id: options.company_id,
          regime: options.regime,
        }
      );

      return response;
    } catch (error) {
      console.error('Error previewing import:', error);
      throw new Error('Impossible de prévisualiser l\'import. Vérifiez votre connexion.');
    }
  }

  /**
   * Valider la structure d'un fichier avant import
   * Vérifie le format, les colonnes requises, et les données
   */
  async validateFile(file: File): Promise<FileValidationResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${API_ENDPOINTS.ACCOUNTING.IMPORT_CHART_FILE}/validate/`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating file:', error);
      throw new Error('Impossible de valider le fichier. Vérifiez le format.');
    }
  }

  /**
   * Obtenir l'historique des imports SYSCOHADA
   */
  async getImportHistory(company_id: string): Promise<ImportHistoryEntry[]> {
    try {
      const response = await apiClient.get<{ history: ImportHistoryEntry[] }>(
        `${API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA}/history/`,
        { company_id }
      );

      return response.history || [];
    } catch (error) {
      console.error('Error fetching import history:', error);
      return []; // Retourner un tableau vide plutôt que d'échouer
    }
  }

  /**
   * Télécharger un template CSV pour l'import personnalisé
   */
  async downloadTemplate(regime: 'MINIMAL' | 'NORMAL' | 'COMPLET' = 'NORMAL'): Promise<Blob> {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA}/template/?regime=${regime}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading template:', error);
      throw new Error('Impossible de télécharger le template.');
    }
  }

  /**
   * Télécharger automatiquement le template
   */
  async downloadTemplateFile(
    regime: 'MINIMAL' | 'NORMAL' | 'COMPLET' = 'NORMAL',
    filename?: string
  ): Promise<void> {
    try {
      const blob = await this.downloadTemplate(regime);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const defaultFilename = `syscohada-template-${regime.toLowerCase()}.csv`;
      link.setAttribute('download', filename || defaultFilename);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template file:', error);
      throw error;
    }
  }

  /**
   * Vérifier si un plan comptable existe déjà pour la société
   */
  async checkExistingChart(company_id: string): Promise<{
    has_chart: boolean;
    account_count: number;
    last_import_date?: string;
    regime?: string;
  }> {
    try {
      const response = await apiClient.get<{
        has_chart: boolean;
        account_count: number;
        last_import_date?: string;
        regime?: string;
      }>(`${API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA}/check/`, {
        company_id,
      });

      return response;
    } catch (error) {
      console.error('Error checking existing chart:', error);
      // Retourner une valeur par défaut en cas d'erreur
      return {
        has_chart: false,
        account_count: 0,
      };
    }
  }

  /**
   * Supprimer tous les comptes importés (DANGER - nécessite confirmation)
   */
  async deleteImportedChart(company_id: string): Promise<{ success: boolean; deleted_count: number }> {
    try {
      const response = await apiClient.delete<{ success: boolean; deleted_count: number }>(
        `${API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA}/`,
        { company_id }
      );

      return response;
    } catch (error) {
      console.error('Error deleting imported chart:', error);
      throw new Error('Impossible de supprimer le plan comptable.');
    }
  }

  /**
   * Obtenir les statistiques du plan comptable par classe
   */
  async getChartStatistics(company_id: string): Promise<{
    total_accounts: number;
    by_class: Record<string, number>;
    active_accounts: number;
    reconcilable_accounts: number;
  }> {
    try {
      const response = await apiClient.get<{
        total_accounts: number;
        by_class: Record<string, number>;
        active_accounts: number;
        reconcilable_accounts: number;
      }>(`${API_ENDPOINTS.ACCOUNTING.IMPORT_SYSCOHADA}/statistics/`, {
        company_id,
      });

      return response;
    } catch (error) {
      console.error('Error fetching chart statistics:', error);
      throw new Error('Impossible de charger les statistiques du plan comptable.');
    }
  }
}

// ===========================
// EXPORT
// ===========================

export const syscohadaImportService = new SYSCOHADAImportService();
export default syscohadaImportService;
