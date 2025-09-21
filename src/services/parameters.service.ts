/**
 * Service de gestion des paramètres système WiseBook ERP V3.0
 */

export interface Parameter {
  key: string;
  name: string;
  description: string;
  category: string;
  type: string;
  value: any;
  default_value: any;
  required: boolean;
  editable: boolean;
  visible: boolean;
  validation_regex?: string;
  allowed_values?: string[];
  min_value?: number;
  max_value?: number;
  group: string;
  order: number;
  help?: string;
}

export interface CompanyConfiguration {
  id: string;
  company_id: string;
  legal_form: string;
  share_capital?: number;
  rccm_number?: string;
  taxpayer_number?: string;
  chart_type: string;
  main_currency: string;
  decimal_places: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  tax_regime: string;
  subject_to_vat: boolean;
  default_vat_rate: number;
  session_duration: number;
  max_login_attempts: number;
  lockout_duration: number;
  theme: string;
  default_language: string;
  logo?: string;
  primary_color: string;
  secondary_color: string;
}

export interface JournalConfiguration {
  id: string;
  company_id: string;
  code: string;
  name: string;
  journal_type: string;
  auto_numbering: boolean;
  prefix: string;
  suffix: string;
  counter: number;
  digit_count: number;
  mandatory_counterpart: boolean;
  auto_lettering: boolean;
}

class ParametersService {
  private baseUrl = '/api';

  // Paramètres système
  async getParameters(category?: string): Promise<Parameter[]> {
    try {
      const url = category 
        ? `${this.baseUrl}/parameters/?category=${category}`
        : `${this.baseUrl}/parameters/`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch parameters');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching parameters:', error);
      throw error;
    }
  }

  async getParametersByCategory(category: string): Promise<Record<string, Parameter[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/parameters/by-category/${category}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch parameters by category');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching parameters by category:', error);
      throw error;
    }
  }

  async updateParameter(key: string, value: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/parameters/${key}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update parameter');
      }

      return true;
    } catch (error) {
      console.error('Error updating parameter:', error);
      throw error;
    }
  }

  async updateMultipleParameters(parameters: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/parameters/bulk-update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters }),
      });

      if (!response.ok) {
        throw new Error('Failed to update parameters');
      }

      return true;
    } catch (error) {
      console.error('Error updating parameters:', error);
      throw error;
    }
  }

  async resetParameter(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/parameters/${key}/reset/`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset parameter');
      }

      return true;
    } catch (error) {
      console.error('Error resetting parameter:', error);
      throw error;
    }
  }

  // Configuration société
  async getCompanyConfiguration(companyId: string): Promise<CompanyConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}/configuration/`);
      if (!response.ok) {
        throw new Error('Failed to fetch company configuration');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching company configuration:', error);
      throw error;
    }
  }

  async updateCompanyConfiguration(
    companyId: string, 
    configuration: Partial<CompanyConfiguration>
  ): Promise<CompanyConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}/configuration/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuration),
      });

      if (!response.ok) {
        throw new Error('Failed to update company configuration');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating company configuration:', error);
      throw error;
    }
  }

  async initializeDefaultConfiguration(companyId: string): Promise<CompanyConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}/configuration/initialize/`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to initialize default configuration');
      }

      return await response.json();
    } catch (error) {
      console.error('Error initializing default configuration:', error);
      throw error;
    }
  }

  // Configuration des journaux
  async getJournalConfigurations(companyId: string): Promise<JournalConfiguration[]> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}/journals/`);
      if (!response.ok) {
        throw new Error('Failed to fetch journal configurations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching journal configurations:', error);
      throw error;
    }
  }

  async updateJournalConfiguration(
    journalId: string,
    configuration: Partial<JournalConfiguration>
  ): Promise<JournalConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/journals/${journalId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuration),
      });

      if (!response.ok) {
        throw new Error('Failed to update journal configuration');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating journal configuration:', error);
      throw error;
    }
  }

  async initializeDefaultJournals(companyId: string): Promise<JournalConfiguration[]> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}/journals/initialize/`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to initialize default journals');
      }

      return await response.json();
    } catch (error) {
      console.error('Error initializing default journals:', error);
      throw error;
    }
  }

  // Utilitaires
  async exportConfiguration(): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/configuration/export/`);
      if (!response.ok) {
        throw new Error('Failed to export configuration');
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error exporting configuration:', error);
      throw error;
    }
  }

  async importConfiguration(file: File): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/configuration/import/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import configuration');
      }

      return true;
    } catch (error) {
      console.error('Error importing configuration:', error);
      throw error;
    }
  }

  async validateConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/configuration/validate/`);
      if (!response.ok) {
        throw new Error('Failed to validate configuration');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error validating configuration:', error);
      throw error;
    }
  }

  // Cache management
  async clearParametersCache(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/parameters/clear-cache/`, {
        method: 'POST',
      });

      return response.ok;
    } catch (error) {
      console.error('Error clearing parameters cache:', error);
      return false;
    }
  }
}

// Instance singleton du service
export const parametersService = new ParametersService();

export default parametersService;