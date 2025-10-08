/**
 * SERVICE CLOSURES - Clôtures comptables
 * Endpoints: /api/v1/closures, /api/v1/provisions, /api/v1/validations
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface Controle {
  id: string;
  code: string;
  libelle: string;
  type: 'coherence' | 'balance' | 'lettrage' | 'rapprochement';
  statut: 'non_execute' | 'en_cours' | 'reussi' | 'echoue';
  resultat?: string;
  created_at: string;
}

export interface Provision {
  id: string;
  type: 'creances_douteuses' | 'depreciation_stocks' | 'risques_clients' | 'autres';
  montant: number;
  base_calcul: number;
  justification: string;
  compte_debit: string;
  compte_credit: string;
  date_comptabilisation: string;
  created_at: string;
}

export interface Document {
  id: string;
  type: 'balance' | 'grand_livre' | 'etats_financiers' | 'pv' | 'liasse_fiscale';
  fichier: string;
  periode: string;
  exercice: string;
  tags: string[];
  niveau_securite: 'public' | 'restreint' | 'confidentiel' | 'strictement_confidentiel';
  created_at: string;
}

export interface Validation {
  id: string;
  periode_id: string;
  niveau: 'comptable' | 'chef_comptable' | 'directeur_financier' | 'cac';
  statut: 'en_attente' | 'validee' | 'rejetee';
  commentaire?: string;
  signature_electronique?: string;
  date_validation?: string;
  created_at: string;
}

// ==================== VALIDATION SCHEMAS ====================

export const executeControleSchema = z.object({
  controle_ids: z.array(z.string().uuid())
    .min(1, 'Au moins un contrôle doit être sélectionné'),
  arret_sur_erreur: z.boolean().default(false),
  generer_rapport: z.boolean().default(true),
  periode_reference: z.string(),
  responsable: z.string().optional(),
});

export type ExecuteControleInput = z.infer<typeof executeControleSchema>;

export const createProvisionSchema = z.object({
  type: z.enum(['creances_douteuses', 'depreciation_stocks', 'risques_clients', 'autres']),

  montant: z.number()
    .min(0.01, 'Le montant doit être supérieur à 0'),

  base_calcul: z.number()
    .min(0, 'La base de calcul ne peut pas être négative'),

  justification: z.string()
    .min(10, 'La justification doit contenir au moins 10 caractères')
    .max(1000, 'La justification ne peut pas dépasser 1000 caractères'),

  compte_debit: z.string()
    .min(3, 'Le compte débit est obligatoire'),

  compte_credit: z.string()
    .min(3, 'Le compte crédit est obligatoire'),

  date_comptabilisation: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  methode_calcul: z.string().optional(),
  piece_justificative: z.string().optional(),
});

export type CreateProvisionInput = z.infer<typeof createProvisionSchema>;

export const uploadDocumentSchema = z.object({
  type: z.enum(['balance', 'grand_livre', 'etats_financiers', 'pv', 'liasse_fiscale']),

  fichier: z.instanceof(File, { message: 'Le fichier est obligatoire' }),

  periode: z.string()
    .min(6, 'La période est obligatoire (ex: 2024-12)'),

  exercice: z.string()
    .regex(/^\d{4}$/, 'Format d\'exercice invalide (YYYY)'),

  tags: z.array(z.string()).optional().default([]),

  niveau_securite: z.enum(['public', 'restreint', 'confidentiel', 'strictement_confidentiel'])
    .default('restreint'),

  duree_conservation: z.number().int().min(1).max(99).optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export const createValidationSchema = z.object({
  periode_id: z.string().uuid('ID de période invalide'),

  niveau: z.enum(['comptable', 'chef_comptable', 'directeur_financier', 'cac']),

  commentaire: z.string()
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .optional(),

  checklist_complete: z.boolean()
    .refine(val => val === true, { message: 'La checklist doit être complétée' }),

  signature_electronique: z.string().optional(),
  verrouillage_definitif: z.boolean().default(false),
});

export type CreateValidationInput = z.infer<typeof createValidationSchema>;

// ==================== SERVICE CLASS ====================

class ClosuresService {
  private readonly BASE_URL = '/api/v1';

  // ==================== CONTRÔLES ====================

  async getControles(params?: { type?: string; statut?: string }): Promise<Controle[]> {
    try {
      const response = await apiClient.get<{ results: Controle[] }>(
        `${this.BASE_URL}/closures/controles/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des contrôles:', error);
      throw error;
    }
  }

  async executeControles(data: ExecuteControleInput): Promise<{ job_id: string; status: string }> {
    try {
      const validatedData = executeControleSchema.parse(data);
      const response = await apiClient.post(
        `${this.BASE_URL}/closures/controles/execute/`,
        validatedData
      );
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // ==================== PROVISIONS ====================

  async getProvisions(params?: { type?: string; periode?: string }): Promise<Provision[]> {
    try {
      const response = await apiClient.get<{ results: Provision[] }>(
        `${this.BASE_URL}/closures/provisions/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des provisions:', error);
      throw error;
    }
  }

  async createProvision(data: CreateProvisionInput): Promise<Provision> {
    try {
      const validatedData = createProvisionSchema.parse(data);
      const response = await apiClient.post<Provision>(
        `${this.BASE_URL}/closures/provisions/`,
        validatedData
      );
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // ==================== DOCUMENTS ====================

  async getDocuments(params?: { type?: string; periode?: string }): Promise<Document[]> {
    try {
      const response = await apiClient.get<{ results: Document[] }>(
        `${this.BASE_URL}/closures/documents/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      throw error;
    }
  }

  async uploadDocument(data: UploadDocumentInput): Promise<Document> {
    try {
      const validatedData = uploadDocumentSchema.parse(data);
      const response = await apiClient.uploadFile<Document>(
        `${this.BASE_URL}/closures/documents/upload/`,
        validatedData.fichier,
        {
          type: validatedData.type,
          periode: validatedData.periode,
          exercice: validatedData.exercice,
          tags: JSON.stringify(validatedData.tags),
          niveau_securite: validatedData.niveau_securite,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // ==================== VALIDATIONS ====================

  async getValidations(periodeId?: string): Promise<Validation[]> {
    try {
      const response = await apiClient.get<{ results: Validation[] }>(
        `${this.BASE_URL}/closures/validations/`,
        periodeId ? { periode_id: periodeId } : undefined
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des validations:', error);
      throw error;
    }
  }

  async createValidation(data: CreateValidationInput): Promise<Validation> {
    try {
      const validatedData = createValidationSchema.parse(data);
      const response = await apiClient.post<Validation>(
        `${this.BASE_URL}/closures/validations/`,
        validatedData
      );
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }
}

export const closuresService = new ClosuresService();
export { ClosuresService };