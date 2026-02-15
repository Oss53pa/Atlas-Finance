/**
 * Atlas Finance - Journal Entries Import Service
 * Service pour l'import en masse d'écritures comptables
 *
 * Fonctionnalités:
 * - Import écritures depuis CSV/Excel
 * - Validation avant import
 * - Auto-balance des écritures
 * - Détection de duplicatas
 *
 * @version 1.0.0 - Phase 3.3 Complete
 * @date 2025-10-19
 */

import { apiClient } from '@/lib/api';
import API_ENDPOINTS from '@/config/apiEndpoints';

// ===========================
// TYPES & INTERFACES
// ===========================

export interface JournalEntriesImportRequest {
  company_id: string;
  fiscal_year_id: string;
  file: File;
  file_format: 'csv' | 'excel';
  auto_balance?: boolean; // Auto-équilibrer débit/crédit
  skip_duplicates?: boolean;
  validate_accounts?: boolean; // Vérifier que les comptes existent
  validate_only?: boolean; // Seulement valider sans importer
}

export interface ImportedEntry {
  row_number: number;
  journal_code: string;
  entry_date: string;
  reference?: string;
  label: string;
  lines: Array<{
    account_code: string;
    account_label?: string;
    debit: number;
    credit: number;
    third_party_id?: string;
    analytical_code?: string;
  }>;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  validation_errors?: string[];
  validation_warnings?: string[];
}

export interface JournalEntriesImportResponse {
  import_id: string;
  status: 'success' | 'partial' | 'failed';
  summary: {
    total_rows: number;
    entries_imported: number;
    entries_skipped: number;
    duplicates_detected: number;
    auto_balanced_count: number;
  };
  imported_entries: Array<{
    entry_id: string;
    row_number: number;
    reference: string;
    journal: string;
    date: string;
    total_amount: number;
  }>;
  errors: Array<{
    row_number: number;
    entry_data?: Partial<ImportedEntry>;
    error_type: 'validation' | 'duplicate' | 'unbalanced' | 'account_not_found' | 'other';
    error_message: string;
    error_details?: string[];
  }>;
  warnings: Array<{
    row_number: number;
    warning_type: string;
    message: string;
  }>;
  processing_time_seconds: number;
}

export interface JournalEntriesValidationRequest {
  company_id: string;
  fiscal_year_id: string;
  file: File;
  file_format: 'csv' | 'excel';
  check_duplicates?: boolean;
  check_accounts?: boolean;
}

export interface JournalEntriesValidationResponse {
  is_valid: boolean;
  file_info: {
    filename: string;
    size_bytes: number;
    format: string;
    rows_detected: number;
    columns_detected: string[];
  };
  validation_summary: {
    valid_entries: number;
    invalid_entries: number;
    total_debit: number;
    total_credit: number;
    unbalanced_count: number;
    missing_accounts_count: number;
    duplicate_count: number;
  };
  entries_preview: ImportedEntry[];
  errors: Array<{
    row_number: number;
    error_type: string;
    error_message: string;
    field?: string;
    value?: any;
  }>;
  warnings: string[];
  can_proceed: boolean;
  recommendations: string[];
}

export interface ImportTemplate {
  columns: Array<{
    name: string;
    required: boolean;
    type: 'string' | 'number' | 'date';
    format?: string;
    example: string;
    description: string;
  }>;
  sample_data: Array<Record<string, any>>;
  rules: string[];
}

// ===========================
// SERVICE CLASS
// ===========================

class JournalEntriesImportService {
  /**
   * Importer des écritures comptables en masse
   * Supporte CSV et Excel avec validation et auto-balance
   */
  async importEntries(request: JournalEntriesImportRequest): Promise<JournalEntriesImportResponse> {
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('company_id', request.company_id);
      formData.append('fiscal_year_id', request.fiscal_year_id);
      formData.append('file_format', request.file_format);

      if (request.auto_balance) {
        formData.append('auto_balance', 'true');
      }
      if (request.skip_duplicates) {
        formData.append('skip_duplicates', 'true');
      }
      if (request.validate_accounts !== false) {
        formData.append('validate_accounts', 'true');
      }
      if (request.validate_only) {
        formData.append('validate_only', 'true');
      }

      const response = await fetch('/api/ecritures/import/', {
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
      console.error('Error importing journal entries:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Impossible d\'importer les écritures comptables.'
      );
    }
  }

  /**
   * Valider un fichier d'écritures avant import
   * Vérifie la structure, les comptes, l'équilibre, les duplicatas
   */
  async validateEntries(request: JournalEntriesValidationRequest): Promise<JournalEntriesValidationResponse> {
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('company_id', request.company_id);
      formData.append('fiscal_year_id', request.fiscal_year_id);
      formData.append('file_format', request.file_format);

      if (request.check_duplicates) {
        formData.append('check_duplicates', 'true');
      }
      if (request.check_accounts !== false) {
        formData.append('check_accounts', 'true');
      }

      const response = await fetch('/api/ecritures/import/validate/', {
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
      console.error('Error validating journal entries:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Impossible de valider le fichier d\'écritures.'
      );
    }
  }

  /**
   * Télécharger un template CSV/Excel pour l'import
   */
  async downloadTemplate(format: 'csv' | 'excel' = 'excel'): Promise<Blob> {
    try {
      const response = await fetch(
        `/api/ecritures/import/template/?format=${format}`,
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
  async downloadTemplateFile(format: 'csv' | 'excel' = 'excel', filename?: string): Promise<void> {
    try {
      const blob = await this.downloadTemplate(format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = format === 'excel' ? 'xlsx' : 'csv';
      const defaultFilename = `ecritures-import-template.${extension}`;

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
   * Obtenir la structure du template
   */
  async getTemplateStructure(): Promise<ImportTemplate> {
    try {
      const response = await apiClient.get<ImportTemplate>(
        '/api/ecritures/import/template/structure/'
      );

      return response;
    } catch (error) {
      console.error('Error fetching template structure:', error);
      throw new Error('Impossible de charger la structure du template.');
    }
  }

  /**
   * Obtenir l'historique des imports
   */
  async getImportHistory(company_id: string, limit: number = 50): Promise<{
    imports: Array<{
      import_id: string;
      imported_at: string;
      user: string;
      filename: string;
      status: 'success' | 'partial' | 'failed';
      entries_imported: number;
      entries_failed: number;
      processing_time_seconds: number;
    }>;
    total: number;
  }> {
    try {
      const response = await apiClient.get<any>(
        '/api/ecritures/import/history/',
        {
          company_id,
          limit,
        }
      );

      return response;
    } catch (error) {
      console.error('Error fetching import history:', error);
      throw new Error('Impossible de charger l\'historique des imports.');
    }
  }

  /**
   * Obtenir les détails d'un import spécifique
   */
  async getImportDetails(import_id: string): Promise<JournalEntriesImportResponse> {
    try {
      const response = await apiClient.get<JournalEntriesImportResponse>(
        `/api/ecritures/import/${import_id}/`
      );

      return response;
    } catch (error) {
      console.error('Error fetching import details:', error);
      throw new Error('Impossible de charger les détails de l\'import.');
    }
  }

  /**
   * Annuler un import (soft delete des écritures importées)
   */
  async cancelImport(import_id: string): Promise<{
    success: boolean;
    deleted_entries_count: number;
    message: string;
  }> {
    try {
      const response = await apiClient.post<any>(
        `/api/ecritures/import/${import_id}/cancel/`
      );

      return response;
    } catch (error) {
      console.error('Error canceling import:', error);
      throw new Error('Impossible d\'annuler l\'import.');
    }
  }
}

// ===========================
// EXPORT
// ===========================

export const journalEntriesImportService = new JournalEntriesImportService();
export default journalEntriesImportService;
