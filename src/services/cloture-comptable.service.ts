/**
 * SERVICE CLÔTURE COMPTABLE
 *
 * Gestion complète du processus de clôture comptable:
 * - Initiation et suivi des clôtures
 * - Calcul des provisions
 * - Validation des écritures
 * - Génération des états financiers
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient } from '../lib/api-client';

// ===== TYPES =====

export interface ClotureComptable {
  id: string;
  exercice: string;
  periode: string;
  statut: 'initiee' | 'en_cours' | 'validee' | 'finalisee' | 'annulee';
  date_debut: string;
  date_fin?: string;
  initiateur: string;
  validateur?: string;
  etapes_completees: string[];
  etapes_restantes: string[];
  balance_equilibree: boolean;
  provisions_calculees: boolean;
  etats_financiers_generes: boolean;
  commentaires?: string;
}

export interface ExerciceDisponible {
  id: string;
  code: string;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'cloture' | 'archive';
  peut_cloturer: boolean;
  raisons_blocage?: string[];
}

export interface BalanceGenerale {
  date_generation: string;
  exercice: string;
  periode: string;
  total_debit: number;
  total_credit: number;
  difference: number;
  est_equilibree: boolean;
  lignes: LigneBalance[];
}

export interface LigneBalance {
  numero_compte: string;
  libelle_compte: string;
  solde_debit: number;
  solde_credit: number;
  solde_final: number;
  type_compte: string;
}

export interface ProvisionReelle {
  id: string;
  type_provision: 'conges_payes' | 'creances_douteuses' | 'garanties' | 'litiges' | 'autre';
  montant_calcule: number;
  montant_valide?: number;
  methode_calcul: string;
  base_calcul: Record<string, any>;
  justification: string;
  statut: 'calculee' | 'validee' | 'rejetee';
  date_calcul: string;
  date_validation?: string;
}

export interface IndicateursPerformance {
  exercice: string;
  periode: string;
  chiffre_affaires: number;
  resultat_exploitation: number;
  resultat_net: number;
  marge_brute: number;
  ratio_endettement: number;
  rotation_stocks: number;
  delai_paiement_clients: number;
  delai_paiement_fournisseurs: number;
  tresorerie_nette: number;
  fonds_roulement: number;
  besoin_fonds_roulement: number;
}

// ===== SERVICE =====

class ClotureComptableService extends BaseApiService<
  ClotureComptable,
  Partial<ClotureComptable>,
  Partial<ClotureComptable>
> {
  protected readonly basePath = '/api/cloture_comptable/api/clotures';
  protected readonly entityName = 'clôture comptable';

  /**
   * Obtenir les exercices disponibles pour clôture
   */
  async getExercicesDisponibles(): Promise<ExerciceDisponible[]> {
    return apiClient.get<ExerciceDisponible[]>('/api/cloture_comptable/api/exercices/');
  }

  /**
   * Obtenir la balance générale réelle
   */
  async getBalanceReelle(params: {
    exercice: string;
    periode?: string;
  }): Promise<BalanceGenerale> {
    return apiClient.get<BalanceGenerale>('/api/cloture_comptable/api/balance-reelle/', {
      params,
    });
  }

  /**
   * Calculer les provisions réelles
   */
  async calculerProvisionsReelles(
    params: {
      exercice: string;
      types_provision?: string[];
    },
    options?: CrudOptions
  ): Promise<ProvisionReelle[]> {
    return apiClient.post<ProvisionReelle[]>(
      '/api/cloture_comptable/api/provisions-reelles/',
      params,
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Provisions calculées avec succès',
      }
    );
  }

  /**
   * Valider une provision
   */
  async validerProvision(
    provisionId: string,
    data: {
      montant_valide: number;
      commentaire?: string;
    },
    options?: CrudOptions
  ) {
    return apiClient.post(
      '/api/cloture_comptable/api/valider-provision/',
      {
        provision_id: provisionId,
        ...data,
      },
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Provision validée',
      }
    );
  }

  /**
   * Obtenir les indicateurs de performance
   */
  async getIndicateursPerformance(params: {
    exercice: string;
    periode?: string;
  }): Promise<IndicateursPerformance> {
    return apiClient.get<IndicateursPerformance>('/api/cloture_comptable/api/indicateurs/', {
      params,
    });
  }

  /**
   * Initier une nouvelle clôture
   */
  async initierCloture(
    data: {
      exercice: string;
      periode: string;
      commentaires?: string;
    },
    options?: CrudOptions
  ) {
    return this.create(
      {
        ...data,
        statut: 'initiee',
        etapes_completees: [],
      },
      {
        ...options,
        successMessage: 'Clôture initiée avec succès',
      }
    );
  }

  /**
   * Valider une clôture (passage à statut validée)
   */
  async valider(clotureId: string, options?: CrudOptions) {
    return this.update(
      clotureId,
      { statut: 'validee' },
      {
        ...options,
        successMessage: 'Clôture validée',
      }
    );
  }

  /**
   * Finaliser une clôture (irréversible)
   */
  async finaliser(clotureId: string, options?: CrudOptions) {
    return apiClient.post(
      `${this.basePath}/${clotureId}/finaliser/`,
      {},
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Clôture finalisée',
      }
    );
  }

  /**
   * Annuler une clôture
   */
  async annuler(
    clotureId: string,
    raison: string,
    options?: CrudOptions
  ) {
    return this.update(
      clotureId,
      { statut: 'annulee', commentaires: raison },
      {
        ...options,
        successMessage: 'Clôture annulée',
      }
    );
  }

  /**
   * Obtenir le statut d'une clôture
   */
  async getStatut(clotureId: string) {
    return apiClient.get(`${this.basePath}/${clotureId}/statut/`);
  }

  /**
   * Obtenir l'historique des clôtures
   */
  async getHistorique(params?: { exercice?: string; limit?: number }) {
    return this.getAll(params);
  }

  /**
   * Générer les états financiers
   */
  async genererEtatsFinanciers(
    clotureId: string,
    types: string[],
    options?: CrudOptions
  ) {
    return apiClient.post(
      `${this.basePath}/${clotureId}/etats-financiers/`,
      { types },
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'États financiers générés',
      }
    );
  }

  /**
   * Télécharger un rapport de clôture
   */
  async telechargerRapport(clotureId: string, format: 'pdf' | 'excel' = 'pdf') {
    return apiClient.get(`${this.basePath}/${clotureId}/rapport/`, {
      params: { format },
      responseType: 'blob',
    });
  }

  /**
   * Vérifier les conditions de clôture
   */
  async verifierConditions(exercice: string, periode: string) {
    return apiClient.get(`${this.basePath}/verifier-conditions/`, {
      params: { exercice, periode },
    });
  }
}

// ===== EXPORT =====

export const clotureComptableService = new ClotureComptableService();

export default clotureComptableService;
