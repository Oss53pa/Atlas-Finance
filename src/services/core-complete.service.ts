/**
 * SERVICE CORE COMPLET
 *
 * Gestion complète des entités de base:
 * - Sociétés (Companies)
 * - Exercices fiscaux (Fiscal Years)
 * - Devises (Currencies)
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  Company,
  FiscalYear,
  Currency,
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateFiscalYearDto,
  UpdateFiscalYearDto,
} from '../types/api.types';

/**
 * SERVICE SOCIÉTÉS
 */
class CompaniesService extends BaseApiService<Company, CreateCompanyDto, UpdateCompanyDto> {
  protected readonly basePath = '/api/societes';
  protected readonly entityName = 'société';

  /**
   * Obtenir les sociétés actives
   */
  async getActiveCompanies(): Promise<Company[]> {
    return apiClient.get<Company[]>(this.basePath + '/', {
      actif: true,
    });
  }

  /**
   * Obtenir la société par défaut
   */
  async getDefaultCompany(): Promise<Company | null> {
    const companies = await this.getActiveCompanies();
    return companies.length > 0 ? companies[0] : null;
  }

  /**
   * Vérifier si un code société existe
   */
  async checkCodeExists(code: string): Promise<boolean> {
    try {
      const companies = await apiClient.get<Company[]>(this.basePath + '/', {
        code,
      });
      return companies.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Upload du logo
   */
  async uploadLogo(
    companyId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Company> {
    return apiClient.uploadFile<Company>(
      `${this.basePath}/${companyId}/upload-logo/`,
      file,
      {},
      onProgress
        ? (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        : undefined
    );
  }

  /**
   * Supprimer le logo
   */
  async deleteLogo(companyId: string, options?: CrudOptions): Promise<Company> {
    return this.customAction<Company>(
      'delete',
      'delete-logo',
      companyId,
      {},
      {
        ...options,
        successMessage: 'Logo supprimé',
      }
    );
  }

  /**
   * Obtenir les statistiques d'une société
   */
  async getStatistics(companyId: string): Promise<{
    nombre_exercices: number;
    exercice_actif?: FiscalYear;
    nombre_utilisateurs: number;
    date_creation: string;
    modules_actifs: string[];
  }> {
    return apiClient.get(`${this.basePath}/${companyId}/statistics/`);
  }

  /**
   * Activer/Désactiver une société
   */
  async toggleActive(companyId: string, options?: CrudOptions): Promise<Company> {
    return this.customAction<Company>(
      'post',
      'toggle-active',
      companyId,
      {},
      {
        ...options,
        successMessage: 'Statut modifié avec succès',
      }
    );
  }
}

/**
 * SERVICE EXERCICES FISCAUX
 */
class FiscalYearsService extends BaseApiService<
  FiscalYear,
  CreateFiscalYearDto,
  UpdateFiscalYearDto
> {
  protected readonly basePath = '/api/exercices';
  protected readonly entityName = 'exercice fiscal';

  /**
   * Obtenir les exercices par société
   */
  async getByCompany(societeId: string, params?: QueryParams): Promise<FiscalYear[]> {
    return apiClient.get<FiscalYear[]>(this.basePath + '/', {
      ...params,
      societe: societeId,
    });
  }

  /**
   * Obtenir l'exercice actif (ouvert)
   */
  async getActiveFiscalYear(societeId?: string): Promise<FiscalYear | null> {
    const fiscalYears = await apiClient.get<FiscalYear[]>(this.basePath + '/', {
      statut: 'ouvert',
      societe: societeId,
      actif: true,
    });
    return fiscalYears.length > 0 ? fiscalYears[0] : null;
  }

  /**
   * Obtenir les exercices par statut
   */
  async getByStatus(statut: string, params?: QueryParams): Promise<FiscalYear[]> {
    return apiClient.get<FiscalYear[]>(this.basePath + '/', {
      ...params,
      statut,
    });
  }

  /**
   * Obtenir l'exercice qui contient une date
   */
  async getByDate(date: string, societeId?: string): Promise<FiscalYear | null> {
    try {
      const result = await apiClient.get<{ exercice: FiscalYear | null }>(
        `${this.basePath}/by-date/`,
        {
          date,
          societe: societeId,
        }
      );
      return result.exercice;
    } catch {
      return null;
    }
  }

  /**
   * Vérifier si un code existe
   */
  async checkCodeExists(code: string, societeId?: string): Promise<boolean> {
    try {
      const fiscalYears = await apiClient.get<FiscalYear[]>(this.basePath + '/', {
        code,
        societe: societeId,
      });
      return fiscalYears.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Vérifier si des dates se chevauchent
   */
  async checkDateOverlap(
    dateDebut: string,
    dateFin: string,
    societeId: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const result = await apiClient.get<{ overlap: boolean }>(
        `${this.basePath}/check-overlap/`,
        {
          date_debut: dateDebut,
          date_fin: dateFin,
          societe: societeId,
          exclude: excludeId,
        }
      );
      return result.overlap;
    } catch {
      return false;
    }
  }

  /**
   * Ouvrir un exercice
   */
  async open(id: string, options?: CrudOptions): Promise<FiscalYear> {
    return this.customAction<FiscalYear>(
      'post',
      'open',
      id,
      {},
      {
        ...options,
        successMessage: 'Exercice ouvert avec succès',
      }
    );
  }

  /**
   * Clôturer un exercice
   */
  async close(id: string, options?: CrudOptions): Promise<FiscalYear> {
    return this.customAction<FiscalYear>(
      'post',
      'close',
      id,
      {},
      {
        ...options,
        successMessage: 'Exercice clôturé avec succès',
      }
    );
  }

  /**
   * Archiver un exercice
   */
  async archive(id: string, options?: CrudOptions): Promise<FiscalYear> {
    return this.customAction<FiscalYear>(
      'post',
      'archive',
      id,
      {},
      {
        ...options,
        successMessage: 'Exercice archivé avec succès',
      }
    );
  }

  /**
   * Réouvrir un exercice clôturé
   */
  async reopen(id: string, options?: CrudOptions): Promise<FiscalYear> {
    return this.customAction<FiscalYear>(
      'post',
      'reopen',
      id,
      {},
      {
        ...options,
        successMessage: 'Exercice réouvert avec succès',
      }
    );
  }

  /**
   * Obtenir les statistiques d'un exercice
   */
  async getStatistics(id: string): Promise<{
    nombre_ecritures: number;
    nombre_ecritures_validees: number;
    total_debit: number;
    total_credit: number;
    nombre_comptes_utilises: number;
    periode: { debut: string; fin: string };
  }> {
    return apiClient.get(`${this.basePath}/${id}/statistics/`);
  }
}

/**
 * SERVICE DEVISES
 */
class CurrenciesService extends BaseApiService<Currency> {
  protected readonly basePath = '/api/devises';
  protected readonly entityName = 'devise';

  /**
   * Obtenir les devises actives
   */
  async getActiveCurrencies(): Promise<Currency[]> {
    return apiClient.get<Currency[]>(this.basePath + '/', {
      actif: true,
    });
  }

  /**
   * Obtenir la devise de référence
   */
  async getReferenceCurrency(): Promise<Currency | null> {
    const currencies = await apiClient.get<Currency[]>(this.basePath + '/', {
      devise_reference: true,
    });
    return currencies.length > 0 ? currencies[0] : null;
  }

  /**
   * Vérifier si un code devise existe
   */
  async checkCodeExists(code: string): Promise<boolean> {
    try {
      const currencies = await apiClient.get<Currency[]>(this.basePath + '/', {
        code,
      });
      return currencies.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Définir comme devise de référence
   */
  async setAsReference(id: string, options?: CrudOptions): Promise<Currency> {
    return this.customAction<Currency>(
      'post',
      'set-reference',
      id,
      {},
      {
        ...options,
        successMessage: 'Devise de référence définie',
      }
    );
  }

  /**
   * Mettre à jour le taux de change
   */
  async updateExchangeRate(
    id: string,
    tauxChange: number,
    options?: CrudOptions
  ): Promise<Currency> {
    return this.customAction<Currency>(
      'patch',
      'update-rate',
      id,
      { taux_change: tauxChange },
      {
        ...options,
        successMessage: 'Taux de change mis à jour',
      }
    );
  }

  /**
   * Convertir un montant entre devises
   */
  async convert(params: {
    montant: number;
    devise_source: string;
    devise_cible: string;
    date?: string;
  }): Promise<{
    montant_source: number;
    montant_cible: number;
    taux_change: number;
    devise_source: Currency;
    devise_cible: Currency;
    date: string;
  }> {
    return apiClient.get(`${this.basePath}/convert/`, params);
  }

  /**
   * Obtenir l'historique des taux de change
   */
  async getExchangeRateHistory(
    currencyId: string,
    dateDebut?: string,
    dateFin?: string
  ): Promise<
    Array<{
      date: string;
      taux_change: number;
    }>
  > {
    return apiClient.get(`${this.basePath}/${currencyId}/rate-history/`, {
      date_debut: dateDebut,
      date_fin: dateFin,
    });
  }

  /**
   * Import des taux de change
   */
  async importExchangeRates(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: number; errors: any[] }> {
    return apiClient.uploadFile<{ success: number; errors: any[] }>(
      this.basePath + '/import-rates/',
      file,
      {},
      onProgress
        ? (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        : undefined
    );
  }
}

/**
 * EXPORTS
 */
export const companiesService = new CompaniesService();
export const fiscalYearsService = new FiscalYearsService();
export const currenciesService = new CurrenciesService();

export default {
  companies: companiesService,
  fiscalYears: fiscalYearsService,
  currencies: currenciesService,
};