/**
 * SERVICE TIERS - Partenaires, Lettrage, Recouvrement
 * Endpoints: /api/v1/tiers, /api/v1/lettrage, /api/v1/recouvrement
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface Partenaire {
  id: string;
  type: 'client' | 'fournisseur' | 'client_fournisseur';
  raison_sociale: string;
  forme_juridique?: string;
  siren?: string;
  siret?: string;
  tva_intracommunautaire?: string;
  adresse: string;
  ville: string;
  code_postal: string;
  pays: string;
  telephone?: string;
  email?: string;
  contact_principal?: string;
  conditions_paiement?: string;
  created_at: string;
}

export interface Lettrage {
  id: string;
  compte_id: string;
  reference: string;
  montant_debit: number;
  montant_credit: number;
  date_operation: string;
  commentaire?: string;
  created_at: string;
}

export interface TransfertContentieux {
  id: string;
  creance_ids: string[];
  motif: string;
  service_recouvrement: string;
  date_transfert: string;
  provision_montant?: number;
  documents: string[];
  created_at: string;
}

// ==================== VALIDATION SCHEMAS ====================

export const createPartenaireSchema = z.object({
  type: z.enum(['client', 'fournisseur', 'client_fournisseur']),

  raison_sociale: z.string()
    .min(2, 'La raison sociale doit contenir au moins 2 caractères')
    .max(200, 'La raison sociale ne peut pas dépasser 200 caractères'),

  forme_juridique: z.string().optional(),
  siren: z.string().regex(/^\d{9}$/, 'Le SIREN doit contenir 9 chiffres').optional(),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres').optional(),
  tva_intracommunautaire: z.string().optional(),

  adresse: z.string().min(5, 'L\'adresse est obligatoire'),
  ville: z.string().min(2, 'La ville est obligatoire'),
  code_postal: z.string().min(4, 'Le code postal est invalide'),
  pays: z.string().min(2, 'Le pays est obligatoire').default('France'),

  telephone: z.string()
    .regex(/^[\d\s\+\-\(\)]+$/, 'Format de téléphone invalide')
    .optional(),

  email: z.string()
    .email('Format d\'email invalide')
    .optional(),

  contact_principal: z.string().optional(),
  conditions_paiement: z.string().optional(),
});

export type CreatePartenaireInput = z.infer<typeof createPartenaireSchema>;

export const createLettrageSchema = z.object({
  compte_id: z.string().uuid('ID de compte invalide'),

  reference: z.string()
    .min(1, 'La référence est obligatoire')
    .max(50, 'La référence ne peut pas dépasser 50 caractères'),

  montant_debit: z.number()
    .min(0, 'Le montant débit ne peut pas être négatif'),

  montant_credit: z.number()
    .min(0, 'Le montant crédit ne peut pas être négatif'),

  date_operation: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),

  commentaire: z.string().optional(),
  pieces_jointes: z.array(z.string()).optional(),
})
.refine((data) => data.montant_debit > 0 || data.montant_credit > 0, {
  message: 'Au moins un montant (débit ou crédit) doit être supérieur à 0',
  path: ['montant_debit'],
});

export type CreateLettrageInput = z.infer<typeof createLettrageSchema>;

export const createTransfertContentieuxSchema = z.object({
  creance_ids: z.array(z.string().uuid())
    .min(1, 'Au moins une créance doit être sélectionnée'),

  motif: z.string()
    .min(10, 'Le motif doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères'),

  service_recouvrement: z.string()
    .min(2, 'Le service de recouvrement est obligatoire'),

  date_transfert: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  provision_montant: z.number().min(0).optional(),
  documents: z.array(z.string()).optional(),
});

export type CreateTransfertContentieuxInput = z.infer<typeof createTransfertContentieuxSchema>;

// ==================== SERVICE CLASS ====================

class TiersService {
  private readonly BASE_URL = '/api/v1';

  // ==================== PARTENAIRES ====================

  async getPartenaires(params?: {
    search?: string;
    type?: string;
  }): Promise<Partenaire[]> {
    try {
      const response = await apiClient.get<{ results: Partenaire[] }>(
        `${this.BASE_URL}/tiers/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des partenaires:', error);
      throw error;
    }
  }

  async createPartenaire(data: CreatePartenaireInput): Promise<Partenaire> {
    try {
      const validatedData = createPartenaireSchema.parse(data);
      const response = await apiClient.post<Partenaire>(
        `${this.BASE_URL}/tiers/`,
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

  // ==================== LETTRAGE ====================

  async getLettrages(compteId?: string): Promise<Lettrage[]> {
    try {
      const response = await apiClient.get<{ results: Lettrage[] }>(
        `${this.BASE_URL}/lettrage/`,
        compteId ? { compte_id: compteId } : undefined
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des lettrages:', error);
      throw error;
    }
  }

  async createLettrage(data: CreateLettrageInput): Promise<Lettrage> {
    try {
      const validatedData = createLettrageSchema.parse(data);
      const response = await apiClient.post<Lettrage>(
        `${this.BASE_URL}/lettrage/`,
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

  // ==================== RECOUVREMENT ====================

  async transfertContentieux(data: CreateTransfertContentieuxInput): Promise<TransfertContentieux> {
    try {
      const validatedData = createTransfertContentieuxSchema.parse(data);
      const response = await apiClient.post<TransfertContentieux>(
        `${this.BASE_URL}/recouvrement/transfert-contentieux/`,
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

export const tiersService = new TiersService();
export { TiersService };