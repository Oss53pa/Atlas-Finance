/**
 * Service de Migration et Import WiseBook
 * Support migration Sage, Excel, FEC avec IA et validation
 */
import { apiService } from './api';

export interface MigrationSessionData {
  companyId: string;
  migration_name: string;
  source_version: string;
  include_chart_of_accounts: boolean;
  include_opening_balance: boolean;
  include_journal_entries: boolean;
  include_customers: boolean;
  include_suppliers: boolean;
  cutoff_date: string;
  validation_strict: boolean;
}

export interface FileUploadData {
  sessionId: string;
  files: FormData;
}

class MigrationService {
  /**
   * Récupère les templates de migration Sage disponibles
   */
  async getSageMigrationTemplates() {
    const response = await apiService.get('/migration/sage-templates');
    return response.data;
  }

  /**
   * Crée une nouvelle session de migration
   */
  async createMigrationSession(data: MigrationSessionData) {
    const response = await apiService.post('/migration/create-session', data);
    return response.data;
  }

  /**
   * Upload et analyse des fichiers de migration
   */
  async uploadMigrationFiles(data: FileUploadData) {
    const response = await apiService.post(`/migration/sessions/${data.sessionId}/upload`, data.files, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Récupère les suggestions de mapping automatique
   */
  async getAccountMappingSuggestions(params: { sessionId: string }) {
    const response = await apiService.get(`/migration/sessions/${params.sessionId}/mapping-suggestions`);
    return response.data;
  }

  /**
   * Valide la configuration de migration
   */
  async validateMigration(data: { sessionId: string; mappingConfig: any }) {
    const response = await apiService.post(`/migration/sessions/${data.sessionId}/validate`, {
      mapping_config: data.mappingConfig
    });
    return response.data;
  }

  /**
   * Exécute la migration
   */
  async executeMigration(data: { sessionId: string }) {
    const response = await apiService.post(`/migration/sessions/${data.sessionId}/execute`);
    return response.data;
  }

  /**
   * Suivi en temps réel d'une migration en cours
   */
  async getMigrationProgress(sessionId: string) {
    const response = await apiService.get(`/migration/sessions/${sessionId}/progress`);
    return response.data;
  }

  /**
   * Historique des migrations
   */
  async getMigrationHistory(params: { companyId: string; limit?: number }) {
    const response = await apiService.get('/migration/history', { params });
    return response.data;
  }

  /**
   * Détails d'une session de migration
   */
  async getMigrationSessionDetails(sessionId: string) {
    const response = await apiService.get(`/migration/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Rollback d'une migration
   */
  async rollbackMigration(data: { sessionId: string; reason: string }) {
    const response = await apiService.post(`/migration/sessions/${data.sessionId}/rollback`, {
      reason: data.reason
    });
    return response.data;
  }

  /**
   * Export du rapport de migration
   */
  async exportMigrationReport(params: {
    sessionId: string;
    format: 'pdf' | 'excel';
    includeDetails?: boolean;
  }) {
    const response = await apiService.get(`/migration/sessions/${params.sessionId}/export-report`, {
      params,
      responseType: 'blob'
    });

    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `migration-report-${params.sessionId}.${params.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Configuration mapping personnalisé
   */
  async saveCustomMapping(data: {
    sessionId: string;
    sourceCode: string;
    targetCode: string;
    mappingType: string;
    confidence?: number;
  }) {
    const response = await apiService.post(`/migration/sessions/${data.sessionId}/custom-mapping`, data);
    return response.data;
  }

  /**
   * Test de mapping sur échantillon
   */
  async testMapping(data: {
    sessionId: string;
    mappingRules: any[];
    sampleSize?: number;
  }) {
    const response = await apiService.post(`/migration/sessions/${data.sessionId}/test-mapping`, data);
    return response.data;
  }

  /**
   * Import générique (non Sage)
   */
  async createGenericImport(data: {
    companyId: string;
    import_name: string;
    data_type: string;
    file_format: string;
    source_file: File;
  }) {
    const formData = new FormData();
    formData.append('source_file', data.source_file);
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'source_file') {
        formData.append(key, value as string);
      }
    });

    const response = await apiService.post('/import/generic/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Templates d'import Excel prédéfinis
   */
  async getExcelTemplates(dataType: string) {
    const response = await apiService.get('/import/excel-templates', {
      params: { data_type: dataType }
    });
    return response.data;
  }

  /**
   * Téléchargement template Excel
   */
  async downloadExcelTemplate(templateId: string) {
    const response = await apiService.get(`/import/excel-templates/${templateId}/download`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template-${templateId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Validation format FEC (Fichier des Écritures Comptables)
   */
  async validateFECFile(data: { file: File; companyId: string }) {
    const formData = new FormData();
    formData.append('fec_file', data.file);
    formData.append('companyId', data.companyId);

    const response = await apiService.post('/import/fec/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Import FEC vers WiseBook
   */
  async importFECFile(data: {
    validationId: string;
    createNewFiscalYear: boolean;
    fiscalYearStart: string;
    fiscalYearEnd: string;
  }) {
    const response = await apiService.post('/import/fec/execute', data);
    return response.data;
  }

  /**
   * Configuration source de données
   */
  async createDataSourceConfig(data: {
    companyId: string;
    source_name: string;
    source_type: string;
    file_format: string;
    field_mappings: any;
    validation_rules: any;
  }) {
    const response = await apiService.post('/import/data-source-config', data);
    return response.data;
  }

  /**
   * Test de connexion pour sources externes (API, DB)
   */
  async testExternalConnection(data: {
    connection_type: 'API' | 'DATABASE';
    connection_params: any;
  }) {
    const response = await apiService.post('/import/test-connection', data);
    return response.data;
  }

  /**
   * Synchronisation périodique avec source externe
   */
  async setupPeriodicSync(data: {
    sourceConfigId: string;
    schedule: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      time: string;
      enabled: boolean;
    };
  }) {
    const response = await apiService.post('/import/setup-sync', data);
    return response.data;
  }

  /**
   * Nettoyage après migration (suppression fichiers temporaires)
   */
  async cleanupMigration(sessionId: string) {
    const response = await apiService.post(`/migration/sessions/${sessionId}/cleanup`);
    return response.data;
  }
}

export const migrationService = new MigrationService();