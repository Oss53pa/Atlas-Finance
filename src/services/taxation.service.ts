/**
 * SERVICE FRONTEND TAXATION - Atlas Finance v4.1.0
 * BASE PATH: /api/v1/taxation/
 *
 * Alignement 100% avec backend Django REST Framework
 * Architecture standardisée selon P0/P1 audit integration
 *
 * Gestion complète de la fiscalité:
 * - Régimes fiscaux
 * - Types de déclarations
 * - Déclarations fiscales
 * - Lignes de déclarations
 * - Obligations fiscales
 * - Alertes fiscales
 * - Contrôles fiscaux
 * - Documents fiscaux
 * - Événements fiscaux
 * - Analytics et conformité
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/taxation';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

export interface RegimeFiscal {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  type_regime: 'RSI' | 'RNI' | 'CGU' | 'REEL' | 'MICRO';
  taux_is: number;
  taux_tva_standard: number;
  taux_tva_reduit: number;
  seuil_ca_annual: number;
  plafond_deduc_charges: number;
  declarations_obligatoires: string[];
  date_debut_validite: string;
  date_fin_validite?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TypeDeclaration {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  frequence: 'MENSUELLE' | 'BIMESTRIELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'EXCEPTIONNELLE';
  statut: 'OBLIGATOIRE' | 'FACULTATIVE' | 'CONDITIONNELLE';
  jour_echeance: number;
  mois_offset: number;
  formule_calcul?: string;
  comptes_base_calcul: number[];
  comptes_detail: Array<{
    id: number;
    numero: string;
    intitule: string;
  }>;
  taux_penalite_retard: number;
  penalite_fixe: number;
  is_active: boolean;
  ordre_affichage: number;
  created_at: string;
  updated_at: string;
}

export interface LigneDeclaration {
  id: number;
  code_ligne: string;
  libelle: string;
  description?: string;
  montant_base: number;
  taux_applique: number;
  montant_calcule: number;
  obligatoire: boolean;
  calculee_auto: boolean;
  formule?: string;
  ordre: number;
  compte?: number;
  compte_detail?: {
    numero: string;
    intitule: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DeclarationFiscale {
  id: number;
  numero_declaration: string;
  reference_administration?: string;
  exercice: number;
  periode_debut: string;
  periode_fin: string;
  date_limite_depot: string;
  date_limite_paiement: string;
  base_imposable: number;
  montant_impot: number;
  credit_impot: number;
  acompte_verse: number;
  montant_du: number;
  penalite_retard: number;
  majorations: number;
  statut: 'BROUILLON' | 'EN_COURS' | 'VALIDEE' | 'TRANSMISE' | 'ACCEPTEE' | 'REJETEE' | 'PAYEE';
  date_validation?: string;
  date_transmission?: string;
  date_paiement?: string;
  valide_par?: number;
  transmise_par?: number;
  valide_par_detail?: {
    username: string;
    email: string;
  };
  transmise_par_detail?: {
    username: string;
    email: string;
  };
  fichier_declaration?: string;
  accuse_reception?: string;
  donnees_declaration: Record<string, any>;
  observations?: string;
  commentaires_administration?: string;
  type_declaration: number;
  regime_fiscal: number;
  type_declaration_detail: TypeDeclaration;
  regime_fiscal_detail: RegimeFiscal;
  lignes: LigneDeclaration[];
  is_en_retard: boolean;
  jours_retard: number;
  created_at: string;
  updated_at: string;
}

export interface ObligationFiscale {
  id: number;
  debut_obligation: string;
  fin_obligation?: string;
  rappel_actif: boolean;
  nb_jours_rappel: number;
  responsable?: number;
  responsable_detail?: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  statut: 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE';
  observations?: string;
  type_declaration: number;
  regime_fiscal: number;
  type_declaration_detail: TypeDeclaration;
  regime_fiscal_detail: RegimeFiscal;
  prochaines_echeances: string[];
  created_at: string;
  updated_at: string;
}

export interface AlerteFiscale {
  id: number;
  type_alerte: 'ECHEANCE_PROCHE' | 'RETARD_DECLARATION' | 'RETARD_PAIEMENT' | 'CHANGEMENT_REGLEMENTATION' | 'CONTROLE_FISCAL' | 'SEUIL_DEPASSE' | 'AUTRE';
  niveau: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  titre: string;
  message: string;
  date_echeance?: string;
  montant_concerne?: number;
  statut: 'ACTIVE' | 'ACQUITTEE' | 'RESOLUE' | 'IGNOREE';
  date_creation: string;
  date_acquittement?: string;
  acquittee_par?: number;
  acquittee_par_detail?: {
    username: string;
    email: string;
  };
  actions_recommandees: string[];
  commentaires?: string;
  declaration?: number;
  obligation?: number;
  declaration_detail?: {
    numero_declaration: string;
    type: string;
  };
  obligation_detail?: {
    type: string;
    statut: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ControleFiscal {
  id: number;
  numero_controle: string;
  type_controle: 'DESK' | 'ON_SITE' | 'COMPLETE';
  date_debut: string;
  date_fin?: string;
  statut: 'EN_COURS' | 'TERMINE' | 'ANNULE';
  inspecteur_principal?: string;
  periodes_concernees: Array<{ debut: string; fin: string }>;
  impots_concernes: string[];
  observations?: string;
  redressements: Array<{
    impot: string;
    periode: string;
    montant: number;
    motif: string;
  }>;
  montant_total_redressement: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentFiscal {
  id: number;
  titre: string;
  type_document: 'DECLARATION' | 'ATTESTATION' | 'AVIS_IMPOSITION' | 'ACCUSE_RECEPTION' | 'CORRESPONDANCE' | 'AUTRE';
  fichier: string;
  fichier_url?: string;
  date_document: string;
  declaration?: number;
  controle?: number;
  obligation?: number;
  tags: string[];
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EvenementFiscal {
  id: number;
  type_evenement: 'DEPOT_DECLARATION' | 'PAIEMENT_IMPOT' | 'RECEPTION_NOTIFICATION' | 'DEBUT_CONTROLE' | 'FIN_CONTROLE' | 'CHANGEMENT_REGIME' | 'AUTRE';
  titre: string;
  description: string;
  date_evenement: string;
  traite: boolean;
  date_traitement?: string;
  traite_par?: number;
  traite_par_detail?: {
    username: string;
    email: string;
  };
  declaration?: number;
  controle?: number;
  obligation?: number;
  donnees_evenement: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_declarations: number;
  total_amount: number;
  total_paid: number;
  pending_amount: number;
  overdue_count: number;
  by_status: Record<string, number>;
  monthly_evolution: Array<{
    month: string;
    count: number;
  }>;
}

export interface RapportConformite {
  periode: {
    debut: string;
    fin: string;
  };
  societe: string;
  regime_fiscal: string;
  declarations: Array<{
    type: string;
    periode: string;
    statut: string;
    date_depot?: string;
    en_retard: boolean;
    penalites: number;
  }>;
  obligations_respectees: number;
  obligations_en_retard: number;
  montant_penalites: number;
  score_conformite: number;
  recommandations: string[];
}

export interface CalculImpotRequest {
  type_impot: 'TVA' | 'IS' | 'PATENTE' | 'CENTIMES_ADDITIONNELS';
  base_calcul: number;
  periode: string;
  parametres_specifiques?: Record<string, any>;
}

export interface CalculImpotResponse {
  montant: number;
  details: Record<string, any>;
  date_calcul: string;
  regime: string;
}

export interface DeclarationCreateRequest {
  type_declaration: number;
  exercice: number;
  periode_debut: string;
  periode_fin: string;
}

export interface EcheanceProchaine {
  obligation_id: number;
  type_declaration: string;
  date_echeance: string;
  jours_restants: number;
  responsable?: string;
}

export interface Anomalie {
  type: string;
  description: string;
  niveau_gravite: string;
  periode: string;
  montant_impact?: number;
}

export interface ObligationFiscaleVerification {
  type_declaration: TypeDeclaration;
  date_limite: string;
  en_retard: boolean;
  jours_retard?: number;
  penalites?: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class TaxationService {
  // ============================================================================
  // SECTION 1: CRUD RÉGIMES FISCAUX
  // ============================================================================

  /**
   * Récupère la liste de tous les régimes fiscaux
   */
  async getRegimesFiscaux(params?: {
    page?: number;
    page_size?: number;
    is_active?: boolean;
  }): Promise<{ results: RegimeFiscal[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/regimes-fiscaux/`, { params });
    return response.data;
  }

  /**
   * Récupère un régime fiscal par ID
   */
  async getRegimeFiscalById(id: number): Promise<RegimeFiscal> {
    const response = await apiService.get(`${BASE_PATH}/regimes-fiscaux/${id}/`);
    return response.data;
  }

  /**
   * Récupère le régime fiscal actif
   */
  async getRegimeFiscalActif(): Promise<RegimeFiscal> {
    const response = await apiService.get(`${BASE_PATH}/regimes-fiscaux/actif/`);
    return response.data;
  }

  /**
   * Crée un nouveau régime fiscal
   */
  async createRegimeFiscal(data: Partial<RegimeFiscal>): Promise<RegimeFiscal> {
    const response = await apiService.post(`${BASE_PATH}/regimes-fiscaux/`, data);
    return response.data;
  }

  /**
   * Met à jour un régime fiscal existant
   */
  async updateRegimeFiscal(id: number, data: Partial<RegimeFiscal>): Promise<RegimeFiscal> {
    const response = await apiService.patch(`${BASE_PATH}/regimes-fiscaux/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un régime fiscal
   */
  async deleteRegimeFiscal(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/regimes-fiscaux/${id}/`);
  }

  /**
   * Active un régime fiscal spécifique
   */
  async activerRegimeFiscal(id: number): Promise<RegimeFiscal> {
    const response = await apiService.post(`${BASE_PATH}/regimes-fiscaux/${id}/activer/`);
    return response.data;
  }

  // ============================================================================
  // SECTION 2: CRUD TYPES DE DÉCLARATIONS
  // ============================================================================

  /**
   * Récupère la liste de tous les types de déclarations
   */
  async getTypesDeclarations(params?: {
    page?: number;
    page_size?: number;
    is_active?: boolean;
    statut?: string;
  }): Promise<{ results: TypeDeclaration[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/types-declarations/`, { params });
    return response.data;
  }

  /**
   * Récupère un type de déclaration par ID
   */
  async getTypeDeclarationById(id: number): Promise<TypeDeclaration> {
    const response = await apiService.get(`${BASE_PATH}/types-declarations/${id}/`);
    return response.data;
  }

  /**
   * Récupère uniquement les types de déclarations obligatoires
   */
  async getTypesDeclarationsObligatoires(): Promise<TypeDeclaration[]> {
    const response = await apiService.get(`${BASE_PATH}/types-declarations/obligatoires/`);
    return response.data;
  }

  /**
   * Crée un nouveau type de déclaration
   */
  async createTypeDeclaration(data: Partial<TypeDeclaration>): Promise<TypeDeclaration> {
    const response = await apiService.post(`${BASE_PATH}/types-declarations/`, data);
    return response.data;
  }

  /**
   * Met à jour un type de déclaration
   */
  async updateTypeDeclaration(id: number, data: Partial<TypeDeclaration>): Promise<TypeDeclaration> {
    const response = await apiService.patch(`${BASE_PATH}/types-declarations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un type de déclaration
   */
  async deleteTypeDeclaration(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/types-declarations/${id}/`);
  }

  // ============================================================================
  // SECTION 3: CRUD DÉCLARATIONS FISCALES
  // ============================================================================

  /**
   * Récupère la liste des déclarations fiscales avec filtres
   */
  async getDeclarationsFiscales(params?: {
    type_declaration?: number;
    exercice?: number;
    statut?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: DeclarationFiscale[]; count: number; next: string | null; previous: string | null }> {
    const response = await apiService.get(`${BASE_PATH}/declarations/`, { params });
    return response.data;
  }

  /**
   * Récupère une déclaration fiscale par ID
   */
  async getDeclarationFiscale(id: number): Promise<DeclarationFiscale> {
    const response = await apiService.get(`${BASE_PATH}/declarations/${id}/`);
    return response.data;
  }

  /**
   * Crée une déclaration fiscale manuellement
   */
  async createDeclaration(data: Partial<DeclarationFiscale>): Promise<DeclarationFiscale> {
    const response = await apiService.post(`${BASE_PATH}/declarations/`, data);
    return response.data;
  }

  /**
   * Met à jour une déclaration fiscale
   */
  async updateDeclaration(id: number, data: Partial<DeclarationFiscale>): Promise<DeclarationFiscale> {
    const response = await apiService.patch(`${BASE_PATH}/declarations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une déclaration fiscale
   */
  async deleteDeclaration(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/declarations/${id}/`);
  }

  /**
   * Génère automatiquement une déclaration fiscale
   */
  async genererDeclarationAutomatique(data: DeclarationCreateRequest): Promise<DeclarationFiscale> {
    const response = await apiService.post(`${BASE_PATH}/declarations/generer_automatique/`, data);
    return response.data;
  }

  /**
   * Valide une déclaration fiscale
   */
  async validerDeclaration(id: number): Promise<DeclarationFiscale> {
    const response = await apiService.post(`${BASE_PATH}/declarations/${id}/valider/`);
    return response.data;
  }

  /**
   * Transmet une déclaration fiscale à l'administration
   */
  async transmettreDeclaration(id: number): Promise<DeclarationFiscale> {
    const response = await apiService.post(`${BASE_PATH}/declarations/${id}/transmettre/`);
    return response.data;
  }

  /**
   * Exporte une déclaration en PDF
   */
  async exporterDeclarationPDF(id: number): Promise<{ download_url: string; filename: string }> {
    const response = await apiService.get(`${BASE_PATH}/declarations/${id}/export_pdf/`);
    return response.data;
  }

  /**
   * Récupère les statistiques du dashboard déclarations
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiService.get(`${BASE_PATH}/declarations/dashboard_stats/`);
    return response.data;
  }

  // ============================================================================
  // SECTION 4: CRUD LIGNES DE DÉCLARATIONS
  // ============================================================================

  /**
   * Récupère les lignes de déclaration
   */
  async getLignesDeclarations(params?: {
    declaration?: number;
    page?: number;
    page_size?: number;
  }): Promise<{ results: LigneDeclaration[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/lignes-declarations/`, { params });
    return response.data;
  }

  /**
   * Récupère une ligne de déclaration par ID
   */
  async getLigneDeclarationById(id: number): Promise<LigneDeclaration> {
    const response = await apiService.get(`${BASE_PATH}/lignes-declarations/${id}/`);
    return response.data;
  }

  /**
   * Crée une ligne de déclaration
   */
  async createLigneDeclaration(data: Partial<LigneDeclaration>): Promise<LigneDeclaration> {
    const response = await apiService.post(`${BASE_PATH}/lignes-declarations/`, data);
    return response.data;
  }

  /**
   * Met à jour une ligne de déclaration
   */
  async updateLigneDeclaration(id: number, data: Partial<LigneDeclaration>): Promise<LigneDeclaration> {
    const response = await apiService.patch(`${BASE_PATH}/lignes-declarations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une ligne de déclaration
   */
  async deleteLigneDeclaration(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/lignes-declarations/${id}/`);
  }

  // ============================================================================
  // SECTION 5: CRUD OBLIGATIONS FISCALES
  // ============================================================================

  /**
   * Récupère la liste des obligations fiscales
   */
  async getObligationsFiscales(params?: {
    statut?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: ObligationFiscale[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/obligations/`, { params });
    return response.data;
  }

  /**
   * Récupère une obligation fiscale par ID
   */
  async getObligationFiscaleById(id: number): Promise<ObligationFiscale> {
    const response = await apiService.get(`${BASE_PATH}/obligations/${id}/`);
    return response.data;
  }

  /**
   * Crée une obligation fiscale
   */
  async createObligationFiscale(data: Partial<ObligationFiscale>): Promise<ObligationFiscale> {
    const response = await apiService.post(`${BASE_PATH}/obligations/`, data);
    return response.data;
  }

  /**
   * Met à jour une obligation fiscale
   */
  async updateObligationFiscale(id: number, data: Partial<ObligationFiscale>): Promise<ObligationFiscale> {
    const response = await apiService.patch(`${BASE_PATH}/obligations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une obligation fiscale
   */
  async deleteObligationFiscale(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/obligations/${id}/`);
  }

  /**
   * Récupère les échéances fiscales prochaines
   */
  async getEcheancesProchaines(params?: {
    jours?: number;
  }): Promise<EcheanceProchaine[]> {
    const response = await apiService.get(`${BASE_PATH}/obligations/echeances_prochaines/`, { params });
    return response.data;
  }

  // ============================================================================
  // SECTION 6: CRUD ALERTES FISCALES
  // ============================================================================

  /**
   * Récupère la liste des alertes fiscales
   */
  async getAlertesFiscales(params?: {
    statut?: string;
    niveau?: string;
    type_alerte?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: AlerteFiscale[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/alertes/`, { params });
    return response.data;
  }

  /**
   * Récupère une alerte fiscale par ID
   */
  async getAlerteFiscaleById(id: number): Promise<AlerteFiscale> {
    const response = await apiService.get(`${BASE_PATH}/alertes/${id}/`);
    return response.data;
  }

  /**
   * Crée une alerte fiscale
   */
  async createAlerteFiscale(data: Partial<AlerteFiscale>): Promise<AlerteFiscale> {
    const response = await apiService.post(`${BASE_PATH}/alertes/`, data);
    return response.data;
  }

  /**
   * Met à jour une alerte fiscale
   */
  async updateAlerteFiscale(id: number, data: Partial<AlerteFiscale>): Promise<AlerteFiscale> {
    const response = await apiService.patch(`${BASE_PATH}/alertes/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une alerte fiscale
   */
  async deleteAlerteFiscale(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/alertes/${id}/`);
  }

  /**
   * Récupère les alertes non lues
   */
  async getAlertesNonLues(): Promise<AlerteFiscale[]> {
    const response = await apiService.get(`${BASE_PATH}/alertes/non_lues/`);
    return response.data;
  }

  /**
   * Acquitte une alerte fiscale
   */
  async acquitterAlerte(id: number, commentaires?: string): Promise<AlerteFiscale> {
    const response = await apiService.post(`${BASE_PATH}/alertes/${id}/acquitter/`, { commentaires });
    return response.data;
  }

  // ============================================================================
  // SECTION 7: CRUD CONTRÔLES FISCAUX
  // ============================================================================

  /**
   * Récupère la liste des contrôles fiscaux
   */
  async getControlesFiscaux(params?: {
    statut?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: ControleFiscal[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/controles/`, { params });
    return response.data;
  }

  /**
   * Récupère un contrôle fiscal par ID
   */
  async getControleFiscalById(id: number): Promise<ControleFiscal> {
    const response = await apiService.get(`${BASE_PATH}/controles/${id}/`);
    return response.data;
  }

  /**
   * Crée un contrôle fiscal
   */
  async createControleFiscal(data: Partial<ControleFiscal>): Promise<ControleFiscal> {
    const response = await apiService.post(`${BASE_PATH}/controles/`, data);
    return response.data;
  }

  /**
   * Met à jour un contrôle fiscal
   */
  async updateControleFiscal(id: number, data: Partial<ControleFiscal>): Promise<ControleFiscal> {
    const response = await apiService.patch(`${BASE_PATH}/controles/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un contrôle fiscal
   */
  async deleteControleFiscal(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/controles/${id}/`);
  }

  // ============================================================================
  // SECTION 8: CRUD DOCUMENTS FISCAUX
  // ============================================================================

  /**
   * Récupère la liste des documents fiscaux
   */
  async getDocumentsFiscaux(params?: {
    type_document?: string;
    declaration?: number;
    page?: number;
    page_size?: number;
  }): Promise<{ results: DocumentFiscal[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/documents/`, { params });
    return response.data;
  }

  /**
   * Récupère un document fiscal par ID
   */
  async getDocumentFiscalById(id: number): Promise<DocumentFiscal> {
    const response = await apiService.get(`${BASE_PATH}/documents/${id}/`);
    return response.data;
  }

  /**
   * Upload un document fiscal
   */
  async uploadDocumentFiscal(data: FormData): Promise<DocumentFiscal> {
    const response = await apiService.post(`${BASE_PATH}/documents/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Met à jour un document fiscal
   */
  async updateDocumentFiscal(id: number, data: Partial<DocumentFiscal>): Promise<DocumentFiscal> {
    const response = await apiService.patch(`${BASE_PATH}/documents/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un document fiscal
   */
  async deleteDocumentFiscal(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/documents/${id}/`);
  }

  // ============================================================================
  // SECTION 9: CRUD ÉVÉNEMENTS FISCAUX
  // ============================================================================

  /**
   * Récupère la liste des événements fiscaux
   */
  async getEvenementsFiscaux(params?: {
    type_evenement?: string;
    traite?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ results: EvenementFiscal[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/evenements/`, { params });
    return response.data;
  }

  /**
   * Récupère un événement fiscal par ID
   */
  async getEvenementFiscalById(id: number): Promise<EvenementFiscal> {
    const response = await apiService.get(`${BASE_PATH}/evenements/${id}/`);
    return response.data;
  }

  /**
   * Crée un événement fiscal
   */
  async createEvenementFiscal(data: Partial<EvenementFiscal>): Promise<EvenementFiscal> {
    const response = await apiService.post(`${BASE_PATH}/evenements/`, data);
    return response.data;
  }

  /**
   * Met à jour un événement fiscal
   */
  async updateEvenementFiscal(id: number, data: Partial<EvenementFiscal>): Promise<EvenementFiscal> {
    const response = await apiService.patch(`${BASE_PATH}/evenements/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un événement fiscal
   */
  async deleteEvenementFiscal(id: number): Promise<void> {
    await apiService.delete(`${BASE_PATH}/evenements/${id}/`);
  }

  /**
   * Marque un événement fiscal comme traité
   */
  async marquerEvenementTraite(id: number, commentaires?: string): Promise<EvenementFiscal> {
    const response = await apiService.post(`${BASE_PATH}/evenements/${id}/marquer_traite/`, { commentaires });
    return response.data;
  }

  // ============================================================================
  // SECTION 10: ANALYTICS ET CONFORMITÉ
  // ============================================================================

  /**
   * Génère un rapport de conformité fiscale
   */
  async genererRapportConformite(params?: {
    annee?: number;
    exercice?: number;
  }): Promise<RapportConformite> {
    const response = await apiService.get(`${BASE_PATH}/analytics/rapport_conformite/`, { params });
    return response.data;
  }

  /**
   * Détecte les anomalies fiscales
   */
  async detecterAnomalies(params?: {
    periode_debut?: string;
    periode_fin?: string;
  }): Promise<Anomalie[]> {
    const response = await apiService.get(`${BASE_PATH}/analytics/detecter_anomalies/`, { params });
    return response.data;
  }

  /**
   * Vérifie les obligations fiscales et leur conformité
   */
  async verifierObligationsFiscales(params?: {
    annee?: number;
  }): Promise<ObligationFiscaleVerification[]> {
    const response = await apiService.get(`${BASE_PATH}/analytics/obligations_fiscales/`, { params });
    return response.data;
  }

  /**
   * Calcule un impôt selon les paramètres fournis
   */
  async calculerImpot(request: CalculImpotRequest): Promise<CalculImpotResponse> {
    const response = await apiService.post(`${BASE_PATH}/analytics/calcul-impot/`, request);
    return response.data;
  }

  /**
   * Récupère des statistiques analytics globales
   */
  async getAnalyticsStats(params?: {
    periode_debut?: string;
    periode_fin?: string;
  }): Promise<{
    declarations_total: number;
    declarations_en_retard: number;
    montant_total_impots: number;
    montant_penalites: number;
    score_conformite: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/analytics/stats/`, { params });
    return response.data;
  }
}

export const taxationService = new TaxationService();
export default taxationService;
