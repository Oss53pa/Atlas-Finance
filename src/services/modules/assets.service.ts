/**
 * SERVICE ASSETS - Immobilisations & Amortissements
 * Endpoints: /api/v1/immobilisations, /api/v1/amortissements
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface Immobilisation {
  id: string;
  code: string;
  designation: string;
  categorie: string;
  localisation?: string;
  fournisseur?: string;
  date_acquisition: string;
  montant_acquisition: number;
  duree_amortissement: number;
  methode_amortissement: 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle';
  statut: 'en_service' | 'en_maintenance' | 'hors_service' | 'cede';
  numero_serie?: string;
  created_at: string;
}

export interface Amortissement {
  id: string;
  immobilisation_id: string;
  exercice: string;
  montant: number;
  montant_cumule: number;
  valeur_nette_comptable: number;
  date_debut: string;
  date_fin: string;
  created_at: string;
}

// ==================== VALIDATION SCHEMAS ====================

export const createImmobilisationSchema = z.object({
  code: z.string()
    .min(3, 'Le code doit contenir au moins 3 caractères')
    .max(20, 'Le code ne peut pas dépasser 20 caractères'),

  designation: z.string()
    .min(3, 'La désignation doit contenir au moins 3 caractères')
    .max(200, 'La désignation ne peut pas dépasser 200 caractères'),

  categorie: z.string().min(1, 'La catégorie est obligatoire'),
  localisation: z.string().optional(),
  fournisseur: z.string().optional(),

  date_acquisition: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),

  montant_acquisition: z.number()
    .min(0.01, 'Le montant doit être supérieur à 0')
    .max(9999999999.99, 'Montant trop élevé'),

  duree_amortissement: z.number()
    .int('La durée doit être un nombre entier')
    .min(1, 'La durée minimum est de 1 an')
    .max(50, 'La durée maximum est de 50 ans'),

  methode_amortissement: z.enum(['lineaire', 'degressive', 'unites_oeuvre', 'exceptionnelle']),

  statut: z.enum(['en_service', 'en_maintenance', 'hors_service', 'cede'])
    .default('en_service'),

  numero_serie: z.string().optional(),
  description: z.string().optional(),
});

export type CreateImmobilisationInput = z.infer<typeof createImmobilisationSchema>;

export const createAmortissementSchema = z.object({
  immobilisation_id: z.string().uuid('ID d\'immobilisation invalide'),

  exercice: z.string()
    .regex(/^\d{4}$/, 'Format d\'exercice invalide (YYYY)'),

  montant: z.number()
    .min(0, 'Le montant ne peut pas être négatif'),

  date_debut: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  date_fin: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  methode: z.enum(['lineaire', 'degressive', 'unites_oeuvre', 'exceptionnelle']),
});

export type CreateAmortissementInput = z.infer<typeof createAmortissementSchema>;

// ==================== SERVICE CLASS ====================

class AssetsService {
  private readonly BASE_URL = '/api/v1';

  // ==================== IMMOBILISATIONS ====================

  async getImmobilisations(params?: {
    search?: string;
    categorie?: string;
    statut?: string;
    date_debut?: string;
    date_fin?: string;
  }): Promise<Immobilisation[]> {
    try {
      const response = await apiClient.get<{ results: Immobilisation[] }>(
        `${this.BASE_URL}/immobilisations/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des immobilisations:', error);
      throw error;
    }
  }

  async getImmobilisation(id: string): Promise<Immobilisation> {
    try {
      const response = await apiClient.get<Immobilisation>(
        `${this.BASE_URL}/immobilisations/${id}/`
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'immobilisation ${id}:`, error);
      throw error;
    }
  }

  async createImmobilisation(data: CreateImmobilisationInput): Promise<Immobilisation> {
    try {
      const validatedData = createImmobilisationSchema.parse(data);
      const response = await apiClient.post<Immobilisation>(
        `${this.BASE_URL}/immobilisations/`,
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

  async updateImmobilisation(id: string, data: Partial<CreateImmobilisationInput>): Promise<Immobilisation> {
    try {
      const response = await apiClient.patch<Immobilisation>(
        `${this.BASE_URL}/immobilisations/${id}/`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'immobilisation ${id}:`, error);
      throw error;
    }
  }

  async deleteImmobilisation(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_URL}/immobilisations/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'immobilisation ${id}:`, error);
      throw error;
    }
  }

  // ==================== AMORTISSEMENTS ====================

  async getAmortissements(immobilisationId?: string): Promise<Amortissement[]> {
    try {
      const response = await apiClient.get<{ results: Amortissement[] }>(
        `${this.BASE_URL}/amortissements/`,
        immobilisationId ? { immobilisation_id: immobilisationId } : undefined
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des amortissements:', error);
      throw error;
    }
  }

  async createAmortissement(data: CreateAmortissementInput): Promise<Amortissement> {
    try {
      const validatedData = createAmortissementSchema.parse(data);
      const response = await apiClient.post<Amortissement>(
        `${this.BASE_URL}/amortissements/`,
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

  async calculateAmortissement(immobilisationId: string, exercice: string): Promise<{
    montant_annuel: number;
    taux: number;
    prorata: boolean;
  }> {
    try {
      const response = await apiClient.get(
        `${this.BASE_URL}/immobilisations/${immobilisationId}/calculate-amortissement/`,
        { exercice }
      );
      return response;
    } catch (error) {
      console.error('Erreur lors du calcul de l\'amortissement:', error);
      throw error;
    }
  }
}

export const assetsService = new AssetsService();
export { AssetsService };