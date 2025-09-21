import { apiClientClient } from '../lib/apiClient';

// Types pour la fiscalité
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

class TaxationService {
  private baseUrl = '/apiClient/taxation';

  // Régimes fiscaux
  async getRegimesFiscaux(): Promise<RegimeFiscal[]> {
    const response = await apiClient.get(`${this.baseUrl}/regimes-fiscaux/`);
    return response.data.results || response.data;
  }

  async getRegimeFiscalActif(): Promise<RegimeFiscal> {
    const response = await apiClient.get(`${this.baseUrl}/regimes-fiscaux/actif/`);
    return response.data;
  }

  async activerRegimeFiscal(id: number): Promise<RegimeFiscal> {
    const response = await apiClient.post(`${this.baseUrl}/regimes-fiscaux/${id}/activer/`);
    return response.data;
  }

  async createRegimeFiscal(data: Partial<RegimeFiscal>): Promise<RegimeFiscal> {
    const response = await apiClient.post(`${this.baseUrl}/regimes-fiscaux/`, data);
    return response.data;
  }

  async updateRegimeFiscal(id: number, data: Partial<RegimeFiscal>): Promise<RegimeFiscal> {
    const response = await apiClient.patch(`${this.baseUrl}/regimes-fiscaux/${id}/`, data);
    return response.data;
  }

  async deleteRegimeFiscal(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/regimes-fiscaux/${id}/`);
  }

  // Types de déclarations
  async getTypesDeclarations(): Promise<TypeDeclaration[]> {
    const response = await apiClient.get(`${this.baseUrl}/types-declarations/`);
    return response.data.results || response.data;
  }

  async getTypesDeclarationsObligatoires(): Promise<TypeDeclaration[]> {
    const response = await apiClient.get(`${this.baseUrl}/types-declarations/obligatoires/`);
    return response.data;
  }

  // Déclarations fiscales
  async getDeclarationsFiscales(params?: {
    type_declaration?: number;
    exercice?: number;
    statut?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: DeclarationFiscale[]; count: number; next: string | null; previous: string | null }> {
    const response = await apiClient.get(`${this.baseUrl}/declarations/`, { params });
    return response.data;
  }

  async getDeclarationFiscale(id: number): Promise<DeclarationFiscale> {
    const response = await apiClient.get(`${this.baseUrl}/declarations/${id}/`);
    return response.data;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get(`${this.baseUrl}/declarations/dashboard_stats/`);
    return response.data;
  }

  async genererDeclarationAutomatique(data: DeclarationCreateRequest): Promise<DeclarationFiscale> {
    const response = await apiClient.post(`${this.baseUrl}/declarations/generer_automatique/`, data);
    return response.data;
  }

  async validerDeclaration(id: number): Promise<DeclarationFiscale> {
    const response = await apiClient.post(`${this.baseUrl}/declarations/${id}/valider/`);
    return response.data;
  }

  async transmettreDeclaration(id: number): Promise<DeclarationFiscale> {
    const response = await apiClient.post(`${this.baseUrl}/declarations/${id}/transmettre/`);
    return response.data;
  }

  async exporterDeclarationPDF(id: number): Promise<{ download_url: string; filename: string }> {
    const response = await apiClient.get(`${this.baseUrl}/declarations/${id}/export_pdf/`);
    return response.data;
  }

  async updateDeclaration(id: number, data: Partial<DeclarationFiscale>): Promise<DeclarationFiscale> {
    const response = await apiClient.patch(`${this.baseUrl}/declarations/${id}/`, data);
    return response.data;
  }

  async deleteDeclaration(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/declarations/${id}/`);
  }

  // Obligations fiscales
  async getObligationsFiscales(): Promise<ObligationFiscale[]> {
    const response = await apiClient.get(`${this.baseUrl}/obligations/`);
    return response.data.results || response.data;
  }

  async getEcheancesProchaines(): Promise<Array<{
    obligation_id: number;
    type_declaration: string;
    date_echeance: string;
    jours_restants: number;
    responsable?: string;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/obligations/echeances_prochaines/`);
    return response.data;
  }

  // Alertes fiscales
  async getAlertesFiscales(): Promise<AlerteFiscale[]> {
    const response = await apiClient.get(`${this.baseUrl}/alertes/`);
    return response.data.results || response.data;
  }

  async getAlertesNonLues(): Promise<AlerteFiscale[]> {
    const response = await apiClient.get(`${this.baseUrl}/alertes/non_lues/`);
    return response.data;
  }

  async acquitterAlerte(id: number): Promise<AlerteFiscale> {
    const response = await apiClient.post(`${this.baseUrl}/alertes/${id}/acquitter/`);
    return response.data;
  }

  // Analytics et rapports
  async genererRapportConformite(annee?: number): Promise<RapportConformite> {
    const params = annee ? { annee } : {};
    const response = await apiClient.get(`${this.baseUrl}/analytics/rapport_conformite/`, { params });
    return response.data;
  }

  async detecterAnomalies(): Promise<Array<{
    type: string;
    description: string;
    niveau_gravite: string;
    periode: string;
    montant_impact?: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/analytics/detecter_anomalies/`);
    return response.data;
  }

  async verifierObligationsFiscales(): Promise<Array<{
    type_declaration: any;
    date_limite: string;
    en_retard: boolean;
    jours_retard?: number;
    penalites?: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/analytics/obligations_fiscales/`);
    return response.data;
  }

  // Calcul d'impôts
  async calculerImpot(request: CalculImpotRequest): Promise<CalculImpotResponse> {
    const response = await apiClient.post(`${this.baseUrl}/calcul-impot/`, request);
    return response.data;
  }

  // Événements fiscaux
  async getEvenementsFiscaux(): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/evenements/`);
    return response.data.results || response.data;
  }

  async marquerEvenementTraite(id: number): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/evenements/${id}/marquer_traite/`);
    return response.data;
  }

  // Documents fiscaux
  async getDocumentsFiscaux(): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/documents/`);
    return response.data.results || response.data;
  }

  async uploadDocumentFiscal(data: FormData): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/documents/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Contrôles fiscaux
  async getControlesFiscaux(): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/controles/`);
    return response.data.results || response.data;
  }
}

export const taxationService = new TaxationService();
export default taxationService;