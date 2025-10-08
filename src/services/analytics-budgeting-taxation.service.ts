/**
 * SERVICES ANALYTIQUE, BUDGET ET FISCALITÉ
 *
 * Gestion complète:
 * - Comptabilité analytique (Analytical Axis & Centers)
 * - Budget (Budgets & Budget Control)
 * - Fiscalité (Tax Declarations)
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  AnalyticalAxis,
  AnalyticalCenter,
  Budget,
  BudgetControl,
  TaxDeclaration,
} from '../types/api.types';

/**
 * ========================================
 * COMPTABILITÉ ANALYTIQUE
 * ========================================
 */

/**
 * SERVICE AXES ANALYTIQUES
 */
class AnalyticalAxisService extends BaseApiService<AnalyticalAxis> {
  protected readonly basePath = '/api/axes-analytiques';
  protected readonly entityName = 'axe analytique';

  /**
   * Obtenir les axes actifs
   */
  async getActiveAxis(): Promise<AnalyticalAxis[]> {
    return apiClient.get<AnalyticalAxis[]>(this.basePath + '/', {
      actif: true,
    });
  }

  /**
   * Obtenir les axes obligatoires
   */
  async getMandatoryAxis(): Promise<AnalyticalAxis[]> {
    return apiClient.get<AnalyticalAxis[]>(this.basePath + '/', {
      obligatoire: true,
      actif: true,
    });
  }

  /**
   * Vérifier si un code existe
   */
  async checkCodeExists(code: string): Promise<boolean> {
    try {
      const axes = await apiClient.get<AnalyticalAxis[]>(this.basePath + '/', { code });
      return axes.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les centres d'un axe
   */
  async getCenters(axisId: string): Promise<AnalyticalCenter[]> {
    return apiClient.get<AnalyticalCenter[]>(`${this.basePath}/${axisId}/centers/`);
  }
}

/**
 * SERVICE CENTRES ANALYTIQUES
 */
class AnalyticalCentersService extends BaseApiService<AnalyticalCenter> {
  protected readonly basePath = '/api/centres-analytiques';
  protected readonly entityName = 'centre analytique';

  /**
   * Obtenir les centres par axe
   */
  async getByAxis(axeId: string, params?: QueryParams): Promise<AnalyticalCenter[]> {
    return apiClient.get<AnalyticalCenter[]>(this.basePath + '/', {
      ...params,
      axe: axeId,
    });
  }

  /**
   * Obtenir les centres actifs
   */
  async getActiveCenters(axeId?: string): Promise<AnalyticalCenter[]> {
    return apiClient.get<AnalyticalCenter[]>(this.basePath + '/', {
      actif: true,
      axe: axeId,
    });
  }

  /**
   * Obtenir la hiérarchie des centres
   */
  async getHierarchy(axeId?: string): Promise<AnalyticalCenter[]> {
    return apiClient.get<AnalyticalCenter[]>(`${this.basePath}/hierarchy/`, {
      axe: axeId,
    });
  }

  /**
   * Obtenir les centres par niveau
   */
  async getByLevel(niveau: number, axeId?: string): Promise<AnalyticalCenter[]> {
    return apiClient.get<AnalyticalCenter[]>(this.basePath + '/', {
      niveau,
      axe: axeId,
    });
  }

  /**
   * Obtenir les centres par responsable
   */
  async getByResponsible(responsable: string): Promise<AnalyticalCenter[]> {
    return apiClient.get<AnalyticalCenter[]>(this.basePath + '/', {
      responsable,
    });
  }

  /**
   * Vérifier si un code existe
   */
  async checkCodeExists(code: string, axeId?: string): Promise<boolean> {
    try {
      const centers = await apiClient.get<AnalyticalCenter[]>(this.basePath + '/', {
        code,
        axe: axeId,
      });
      return centers.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les ventilations d'un centre
   */
  async getDistributions(
    centerId: string,
    params?: { date_debut?: string; date_fin?: string }
  ): Promise<
    Array<{
      compte: string;
      libelle: string;
      debit: number;
      credit: number;
      solde: number;
    }>
  > {
    return apiClient.get(`${this.basePath}/${centerId}/distributions/`, params);
  }
}

/**
 * ========================================
 * BUDGET
 * ========================================
 */

/**
 * SERVICE BUDGETS
 */
class BudgetsService extends BaseApiService<Budget> {
  protected readonly basePath = '/api/budgets';
  protected readonly entityName = 'budget';

  /**
   * Obtenir les budgets par exercice
   */
  async getByFiscalYear(exerciceId: string, params?: QueryParams): Promise<Budget[]> {
    return apiClient.get<Budget[]>(this.basePath + '/', {
      ...params,
      exercice: exerciceId,
    });
  }

  /**
   * Obtenir les budgets par type
   */
  async getByType(type: string, params?: QueryParams): Promise<Budget[]> {
    return apiClient.get<Budget[]>(this.basePath + '/', {
      ...params,
      type,
    });
  }

  /**
   * Obtenir les budgets par statut
   */
  async getByStatus(statut: string, params?: QueryParams): Promise<Budget[]> {
    return apiClient.get<Budget[]>(this.basePath + '/', {
      ...params,
      statut,
    });
  }

  /**
   * Obtenir le budget actif
   */
  async getActiveBudget(exerciceId?: string): Promise<Budget | null> {
    const budgets = await apiClient.get<Budget[]>(this.basePath + '/', {
      statut: 'valide',
      exercice: exerciceId,
    });
    return budgets.length > 0 ? budgets[0] : null;
  }

  /**
   * Valider un budget
   */
  async validate(id: string, options?: CrudOptions): Promise<Budget> {
    return this.customAction<Budget>(
      'post',
      'validate',
      id,
      {},
      {
        ...options,
        successMessage: 'Budget validé avec succès',
      }
    );
  }

  /**
   * Clôturer un budget
   */
  async close(id: string, options?: CrudOptions): Promise<Budget> {
    return this.customAction<Budget>(
      'post',
      'close',
      id,
      {},
      {
        ...options,
        successMessage: 'Budget clôturé avec succès',
      }
    );
  }

  /**
   * Dupliquer un budget
   */
  async duplicate(
    id: string,
    nouveauExercice: string,
    options?: CrudOptions
  ): Promise<Budget> {
    return this.customAction<Budget>(
      'post',
      'duplicate',
      id,
      { exercice: nouveauExercice },
      {
        ...options,
        successMessage: 'Budget dupliqué avec succès',
      }
    );
  }

  /**
   * Obtenir les contrôles budgétaires
   */
  async getControls(budgetId: string): Promise<BudgetControl[]> {
    return apiClient.get<BudgetControl[]>(`${this.basePath}/${budgetId}/controls/`);
  }

  /**
   * Générer le rapport de réalisation
   */
  async generateExecutionReport(budgetId: string): Promise<{
    budget: Budget;
    controles: BudgetControl[];
    totaux: {
      budgete: number;
      realise: number;
      engage: number;
      disponible: number;
      taux_realisation: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/${budgetId}/execution-report/`);
  }
}

/**
 * SERVICE CONTRÔLE BUDGÉTAIRE
 */
class BudgetControlService extends BaseApiService<BudgetControl> {
  protected readonly basePath = '/api/controles-budgetaires';
  protected readonly entityName = 'contrôle budgétaire';

  /**
   * Obtenir les contrôles par budget
   */
  async getByBudget(budgetId: string, params?: QueryParams): Promise<BudgetControl[]> {
    return apiClient.get<BudgetControl[]>(this.basePath + '/', {
      ...params,
      budget: budgetId,
    });
  }

  /**
   * Obtenir les contrôles par compte
   */
  async getByAccount(compteId: string, params?: QueryParams): Promise<BudgetControl[]> {
    return apiClient.get<BudgetControl[]>(this.basePath + '/', {
      ...params,
      compte: compteId,
    });
  }

  /**
   * Obtenir les contrôles par centre analytique
   */
  async getByAnalyticalCenter(
    centreId: string,
    params?: QueryParams
  ): Promise<BudgetControl[]> {
    return apiClient.get<BudgetControl[]>(this.basePath + '/', {
      ...params,
      centre_analytique: centreId,
    });
  }

  /**
   * Obtenir les dépassements budgétaires
   */
  async getOverruns(budgetId?: string): Promise<BudgetControl[]> {
    const controls = await apiClient.get<BudgetControl[]>(this.basePath + '/', {
      budget: budgetId,
    });
    return controls.filter((c) => c.montant_realise + c.montant_engage > c.montant_budgete);
  }

  /**
   * Recalculer les contrôles
   */
  async recalculate(budgetId: string, options?: CrudOptions): Promise<{ count: number }> {
    return this.customAction<{ count: number }>(
      'post',
      'recalculate',
      undefined,
      { budget: budgetId },
      {
        ...options,
        successMessage: 'Contrôles recalculés',
      }
    );
  }

  /**
   * Vérifier la disponibilité budgétaire
   */
  async checkAvailability(params: {
    budget: string;
    compte: string;
    centre_analytique?: string;
    montant: number;
  }): Promise<{
    disponible: boolean;
    montant_budgete: number;
    montant_realise: number;
    montant_engage: number;
    montant_disponible: number;
  }> {
    return apiClient.get(`${this.basePath}/check-availability/`, params);
  }
}

/**
 * ========================================
 * FISCALITÉ
 * ========================================
 */

/**
 * SERVICE DÉCLARATIONS FISCALES
 */
class TaxDeclarationsService extends BaseApiService<TaxDeclaration> {
  protected readonly basePath = '/api/declarations-fiscales';
  protected readonly entityName = 'déclaration fiscale';

  /**
   * Obtenir les déclarations par type
   */
  async getByType(type: string, params?: QueryParams): Promise<TaxDeclaration[]> {
    return apiClient.get<TaxDeclaration[]>(this.basePath + '/', {
      ...params,
      type,
    });
  }

  /**
   * Obtenir les déclarations par exercice
   */
  async getByFiscalYear(exerciceId: string, params?: QueryParams): Promise<TaxDeclaration[]> {
    return apiClient.get<TaxDeclaration[]>(this.basePath + '/', {
      ...params,
      exercice: exerciceId,
    });
  }

  /**
   * Obtenir les déclarations par statut
   */
  async getByStatus(statut: string, params?: QueryParams): Promise<TaxDeclaration[]> {
    return apiClient.get<TaxDeclaration[]>(this.basePath + '/', {
      ...params,
      statut,
    });
  }

  /**
   * Obtenir les déclarations en retard
   */
  async getOverdue(): Promise<TaxDeclaration[]> {
    return apiClient.get<TaxDeclaration[]>(`${this.basePath}/overdue/`);
  }

  /**
   * Obtenir les déclarations à venir
   */
  async getUpcoming(jours: number = 30): Promise<TaxDeclaration[]> {
    return apiClient.get<TaxDeclaration[]>(`${this.basePath}/upcoming/`, { jours });
  }

  /**
   * Calculer une déclaration
   */
  async calculate(id: string, options?: CrudOptions): Promise<TaxDeclaration> {
    return this.customAction<TaxDeclaration>(
      'post',
      'calculate',
      id,
      {},
      {
        ...options,
        successMessage: 'Déclaration calculée',
      }
    );
  }

  /**
   * Marquer comme déposée
   */
  async markAsSubmitted(
    id: string,
    dateDeclaration: string,
    options?: CrudOptions
  ): Promise<TaxDeclaration> {
    return this.customAction<TaxDeclaration>(
      'post',
      'mark-submitted',
      id,
      { date_declaration: dateDeclaration },
      {
        ...options,
        successMessage: 'Déclaration marquée comme déposée',
      }
    );
  }

  /**
   * Marquer comme payée
   */
  async markAsPaid(
    id: string,
    montantPaye: number,
    datePaiement: string,
    options?: CrudOptions
  ): Promise<TaxDeclaration> {
    return this.customAction<TaxDeclaration>(
      'post',
      'mark-paid',
      id,
      { montant_paye: montantPaye, date_paiement: datePaiement },
      {
        ...options,
        successMessage: 'Paiement enregistré',
      }
    );
  }

  /**
   * Générer le fichier de déclaration
   */
  async generateDeclarationFile(
    id: string,
    format: 'pdf' | 'xml' | 'csv',
    options?: CrudOptions
  ): Promise<{ file_url: string }> {
    return this.customAction<{ file_url: string }>(
      'post',
      'generate-file',
      id,
      { format },
      {
        ...options,
        successMessage: 'Fichier généré avec succès',
      }
    );
  }

  /**
   * Upload du fichier de déclaration
   */
  async uploadDeclarationFile(
    declarationId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<TaxDeclaration> {
    return apiClient.uploadFile<TaxDeclaration>(
      `${this.basePath}/${declarationId}/upload-file/`,
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
   * Obtenir le calendrier fiscal
   */
  async getFiscalCalendar(params?: {
    annee?: number;
    type?: string;
  }): Promise<
    Array<{
      mois: string;
      declarations: Array<{
        type: string;
        libelle: string;
        date_limite: string;
        statut?: string;
      }>;
    }>
  > {
    return apiClient.get(`${this.basePath}/calendar/`, params);
  }

  /**
   * Export des déclarations
   */
  async exportDeclarations(
    format: 'excel' | 'pdf' | 'csv',
    params?: QueryParams,
    filename?: string
  ): Promise<void> {
    return this.export(format, params, filename);
  }
}

/**
 * EXPORTS
 */
export const analyticalAxisService = new AnalyticalAxisService();
export const analyticalCentersService = new AnalyticalCentersService();
export const budgetsService = new BudgetsService();
export const budgetControlService = new BudgetControlService();
export const taxDeclarationsService = new TaxDeclarationsService();

export default {
  analyticalAxis: analyticalAxisService,
  analyticalCenters: analyticalCentersService,
  budgets: budgetsService,
  budgetControl: budgetControlService,
  taxDeclarations: taxDeclarationsService,
};