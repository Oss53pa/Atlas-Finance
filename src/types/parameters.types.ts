/**
 * TYPES TYPESCRIPT - MODULE PARAMÈTRES
 *
 * Types pour la configuration système et les paramètres WiseBook
 */

export type ParameterCategory =
  | 'GENERAL'
  | 'COMPTABILITE'
  | 'FISCALITE'
  | 'TRESORERIE'
  | 'SECURITE'
  | 'INTEGRATION'
  | 'NOTIFICATIONS'
  | 'INTERFACE';

export type ParameterValueType =
  | 'STRING'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'EMAIL'
  | 'URL'
  | 'JSON'
  | 'COLOR';

export type JournalType =
  | 'VENTES'
  | 'ACHATS'
  | 'BANQUE'
  | 'CAISSE'
  | 'OPERATIONS_DIVERSES'
  | 'PAIE'
  | 'IMMOBILISATIONS';

export type NotificationType =
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'SYSTEME';

export type NotificationEvent =
  | 'CONNEXION_ECHEC'
  | 'SAUVEGARDE'
  | 'CLOTURE_PERIODE'
  | 'VALIDATION_ECRITURE'
  | 'RAPPEL_ECHEANCE'
  | 'ERREUR_INTEGRATION'
  | 'MISE_A_JOUR';

export type PlanComptableType =
  | 'SYSCOHADA_NORMAL'
  | 'SYSCOHADA_MINIMAL'
  | 'SYSCOHADA_BANQUE'
  | 'SYSCOHADA_ASSURANCE';

export type RegimeFiscal =
  | 'REEL'
  | 'SIMPLIFIE'
  | 'SYNTHETIQUE';

export type Theme =
  | 'TRINITY_LIGHT'
  | 'TRINITY_DARK'
  | 'CLASSIC';

export interface ParametreSysteme {
  id: string;
  cle: string;
  nom: string;
  description: string;
  categorie: ParameterCategory;
  type_valeur: ParameterValueType;
  valeur: string;
  valeur_par_defaut: string;
  valeur_typee?: any;
  requis: boolean;
  modifiable_runtime: boolean;
  visible_interface: boolean;
  regex_validation?: string;
  valeurs_autorisees?: string[];
  valeur_min?: number;
  valeur_max?: number;
  groupe?: string;
  ordre: number;
  aide?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationSociete {
  id: string;
  societe: string;
  societe_nom?: string;
  forme_juridique: string;
  capital_social?: number;
  numero_rccm?: string;
  numero_contribuable?: string;
  plan_comptable_type: PlanComptableType;
  devise_principale: string;
  devise_principale_nom?: string;
  devise_principale_code?: string;
  nb_decimales: number;
  debut_exercice: string;
  fin_exercice: string;
  regime_fiscal: RegimeFiscal;
  assujetti_tva: boolean;
  taux_tva_defaut: number;
  duree_session: number;
  tentatives_connexion_max: number;
  duree_blocage: number;
  theme: Theme;
  langue_defaut: string;
  logo?: string;
  couleur_principale: string;
  couleur_secondaire: string;
  created_at: string;
  updated_at: string;
}

export interface JournalParametres {
  id: string;
  societe: string;
  societe_nom?: string;
  code: string;
  libelle: string;
  type_journal: JournalType;
  type_journal_display?: string;
  numerotation_auto: boolean;
  prefixe?: string;
  suffixe?: string;
  compteur: number;
  nb_chiffres: number;
  contrepartie_obligatoire: boolean;
  lettrage_auto: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationParametres {
  id: string;
  societe: string;
  societe_nom?: string;
  evenement: NotificationEvent;
  evenement_display?: string;
  type_notification: NotificationType;
  type_notification_display?: string;
  actif: boolean;
  destinataires: string[];
  modele_message: string;
  delai_envoi: number;
  frequence_max: number;
  created_at: string;
  updated_at: string;
}

export interface CreateParametreSystemeDto {
  cle: string;
  nom: string;
  description: string;
  categorie: ParameterCategory;
  type_valeur: ParameterValueType;
  valeur: string;
  valeur_par_defaut: string;
  requis?: boolean;
  modifiable_runtime?: boolean;
  visible_interface?: boolean;
  regex_validation?: string;
  valeurs_autorisees?: string[];
  valeur_min?: number;
  valeur_max?: number;
  groupe?: string;
  ordre?: number;
  aide?: string;
}

export interface UpdateParametreSystemeDto {
  nom?: string;
  description?: string;
  valeur?: string;
  visible_interface?: boolean;
  aide?: string;
}

export interface CreateConfigurationSocieteDto {
  societe: string;
  forme_juridique: string;
  capital_social?: number;
  numero_rccm?: string;
  numero_contribuable?: string;
  plan_comptable_type: PlanComptableType;
  devise_principale: string;
  nb_decimales?: number;
  debut_exercice?: string;
  fin_exercice?: string;
  regime_fiscal?: RegimeFiscal;
  assujetti_tva?: boolean;
  taux_tva_defaut?: number;
  duree_session?: number;
  tentatives_connexion_max?: number;
  duree_blocage?: number;
  theme?: Theme;
  langue_defaut?: string;
  couleur_principale?: string;
  couleur_secondaire?: string;
}

export interface UpdateConfigurationSocieteDto extends Partial<CreateConfigurationSocieteDto> {}

export interface CreateJournalParametresDto {
  societe: string;
  code: string;
  libelle: string;
  type_journal: JournalType;
  numerotation_auto?: boolean;
  prefixe?: string;
  suffixe?: string;
  compteur?: number;
  nb_chiffres?: number;
  contrepartie_obligatoire?: boolean;
  lettrage_auto?: boolean;
}

export interface UpdateJournalParametresDto extends Partial<CreateJournalParametresDto> {}

export interface CreateNotificationParametresDto {
  societe: string;
  evenement: NotificationEvent;
  type_notification: NotificationType;
  actif?: boolean;
  destinataires: string[];
  modele_message: string;
  delai_envoi?: number;
  frequence_max?: number;
}

export interface UpdateNotificationParametresDto extends Partial<CreateNotificationParametresDto> {}

export interface BulkParameterUpdate {
  parametres: Record<string, string>;
}

export interface CategoryOption {
  value: ParameterCategory;
  label: string;
}

export interface TypeOption {
  value: JournalType | NotificationType;
  label: string;
}

export interface ParameterQueryParams {
  categorie?: ParameterCategory;
  type_valeur?: ParameterValueType;
  requis?: boolean;
  modifiable_runtime?: boolean;
  visible_interface?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface JournalQueryParams {
  societe?: string;
  type_journal?: JournalType;
  numerotation_auto?: boolean;
  lettrage_auto?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface NotificationQueryParams {
  societe?: string;
  evenement?: NotificationEvent;
  type_notification?: NotificationType;
  actif?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}